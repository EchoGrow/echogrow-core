import 'dotenv/config';
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { Queue } from 'bullmq';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/modules/prisma/prisma.service';

// ------------------------------------------------------------
// Constants
// ------------------------------------------------------------

export const SHORT_TRANSCRIPT =
  '[00:00:05] Interviewer: Tell me about your last project please.\n' +
  '[00:00:12] Candidate: Um, I built a small website.';

export const SHORT_CV =
  'Junior developer. Bootcamp graduate. Knows HTML, CSS and basic JavaScript.';

const DIMENSION_TYPES = [
  'TECHNICAL_DEPTH',
  'COMMUNICATION',
  'DOMAIN_EXPERIENCE',
  'PROBLEM_SOLVING',
] as const;

type SessionStatus =
  | 'QUEUED'
  | 'PROCESSING'
  | 'SCORED'
  | 'FLAGGED'
  | 'NEEDS_REVIEW'
  | 'COMPLETED'
  | 'FAILED'
  | 'REJECTED';

export const sha256 = (text: string) =>
  createHash('sha256').update(text).digest('hex');

// ------------------------------------------------------------
// Redis / Queue
// ------------------------------------------------------------

export async function resetQueue(): Promise<void> {
  const queue = new Queue('evaluation', {
    connection: {
      host: process.env.REDIS_HOST ?? 'localhost',
      port: Number(process.env.REDIS_PORT ?? 6379),
    },
  });
  try {
    await queue.obliterate({ force: true });
  } finally {
    await queue.close();
  }
}

// ------------------------------------------------------------
// App bootstrap / teardown
// ------------------------------------------------------------

export async function createTestApp(): Promise<{
  app: INestApplication;
  prisma: PrismaService;
}> {
  await resetQueue();

  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  await app.init();

  const prisma = app.get(PrismaService);
  await cleanDatabase(prisma);
  return { app, prisma };
}

export async function closeTestApp(
  app: INestApplication,
  prisma: PrismaService,
): Promise<void> {
  await resetQueue();
  await cleanDatabase(prisma);
  await app.close();
}

// ------------------------------------------------------------
// Database helpers
// ------------------------------------------------------------

export async function cleanDatabase(prisma: PrismaService): Promise<void> {
  await prisma.roadmapItem.deleteMany({});
  await prisma.roadmap.deleteMany({});
  await prisma.skillGap.deleteMany({});
  await prisma.discrepancy.deleteMany({});
  await prisma.dimension.deleteMany({});
  await prisma.scorecard.deleteMany({});
  await prisma.interviewSession.deleteMany({});
  await prisma.candidate.deleteMany({});
}

export async function seedSession(
  prisma: PrismaService,
  opts: {
    status?: SessionStatus;
    email?: string;
    name?: string;
    transcript?: string;
    resume?: string;
    isScored?: boolean;
    isVerified?: boolean;
    isPlanned?: boolean;
    structuredTranscript?: any;
    // ✅ NEW: allows tests to simulate retries and custom processing windows
    processingAttempts?: number;
    processingStartedAt?: Date;
    completedAt?: Date;
  } = {},
) {
  const transcript = opts.transcript ?? SHORT_TRANSCRIPT;
  const resume = opts.resume ?? SHORT_CV;
  const email =
    opts.email ?? `seed.${Date.now()}.${Math.random().toString(36).slice(2)}@example.com`;

  const candidate = await prisma.candidate.upsert({
    where: { email },
    update: {},
    create: { name: opts.name ?? 'Seeded Candidate', email },
  });

  return prisma.interviewSession.create({
    data: {
      candidateId: candidate.id,
      transcript,
      transcriptHash: sha256(transcript),
      resume,
      resumeHash: sha256(resume),
      status: opts.status ?? 'QUEUED',
      // ✅ NEW: required fields (processingStartedAt is non-nullable)
      processingStartedAt: opts.processingStartedAt ?? new Date(),
      processingAttempts: opts.processingAttempts ?? 1,
      isScored: opts.isScored ?? false,
      isVerified: opts.isVerified ?? false,
      isPlanned: opts.isPlanned ?? false,
      ...(opts.completedAt !== undefined ? { completedAt: opts.completedAt } : {}),
      ...(opts.structuredTranscript !== undefined
        ? { structuredTranscript: opts.structuredTranscript }
        : {}),
    },
  });
}

export async function seedScorecard(
  prisma: PrismaService,
  interviewId: string,
  opts: {
    scores?: number[];
    discrepancies?: number;
    gaps?: string[];
    // ✅ NEW: allows tests to simulate real processing windows
    processingStartedAt?: Date;
    completedAt?: Date;
    processingAttempts?: number;
  } = {},
) {
  const scores = opts.scores ?? [4, 4, 4, 4];
  const overall = scores.reduce((a, b) => a + b, 0) / scores.length;

  // ✅ Fetch the session to compute timeSaved
  const session = await prisma.interviewSession.findUnique({
    where: { id: interviewId },
    select: { transcript: true, resume: true, processingStartedAt: true },
  });

  if (!session) throw new Error('Session not found');

  const startedAt = opts.processingStartedAt ?? session.processingStartedAt;
  const completedAt = opts.completedAt ?? new Date();

  // ✅ Apply processing window overrides
  if (
    opts.processingStartedAt ||
    opts.completedAt ||
    opts.processingAttempts !== undefined
  ) {
    await prisma.interviewSession.update({
      where: { id: interviewId },
      data: {
        ...(opts.processingStartedAt
          ? { processingStartedAt: opts.processingStartedAt }
          : {}),
        ...(opts.completedAt ? { completedAt: opts.completedAt } : {}),
        ...(opts.processingAttempts !== undefined
          ? { processingAttempts: opts.processingAttempts }
          : {}),
      },
    });
  }

  // ✅ Compute and save timeSaved snapshot (mirrors pipeline's saveTimeSaved)
  const countWords = (text: string) =>
    text.trim().split(/\s+/).filter(Boolean).length;

  const manualReviewMinutes =
    5 +
    countWords(session.transcript) / 150 +
    countWords(session.resume) / 200 +
    (opts.discrepancies ?? 0) * 3 +
    scores.filter((s) => s <= 2).length * 4;

  const rawSeconds = Math.max(
    0,
    (completedAt.getTime() - startedAt.getTime()) / 1000,
  );
  const echoGrowSeconds = Math.min(rawSeconds, 180);
  const savedSeconds = Math.max(0, manualReviewMinutes * 60 - echoGrowSeconds);
  const savedMinutes = savedSeconds < 60 ? 0 : savedSeconds / 60;

  await prisma.interviewSession.update({
    where: { id: interviewId },
    data: {
      manualReviewMinutes: Math.round(manualReviewMinutes * 10) / 10,
      echoGrowSeconds: Math.round(echoGrowSeconds),
      savedMinutes: Math.round(savedMinutes * 10) / 10,
      completedAt,
    },
  });

  // Create scorecard
  const scorecard = await prisma.scorecard.create({
    data: {
      interviewId,
      overallScore: overall,
      confidence: 0.9,
      dimensions: {
        create: DIMENSION_TYPES.map((type, i) => ({
          dimensionType: type,
          score: scores[i],
          reason: `Seeded reason ${i}`,
          evidenceQuote: {
            quote: `Seeded quote ${i}`,
            speaker: 'Candidate',
            timestamp: `00:01:0${i}`,
          },
        })),
      },
    },
    include: { dimensions: true },
  });

  const discrepancyIds: string[] = [];
  for (let i = 0; i < (opts.discrepancies ?? 0); i++) {
    const d = await prisma.discrepancy.create({
      data: {
        scorecardId: scorecard.id,
        claim: `team_size_${i}`,
        cvQuote: 'Individual contributor on a 4-person team',
        interviewQuote: 'I led a team of six',
        confidence: 0.9,
      },
    });
    discrepancyIds.push(d.id);
  }

  const gaps = opts.gaps ?? [];
  if (gaps.length > 0) {
    const dimensionId = scorecard.dimensions[0].id;
    const skillGaps = [];
    for (const skillName of gaps) {
      skillGaps.push(
        await prisma.skillGap.create({
          data: { dimensionId, skillName, priority: 'MEDIUM' },
        }),
      );
    }
    await prisma.roadmap.create({
      data: {
        scorecardId: scorecard.id,
        items: {
          create: skillGaps.map((g, i) => ({
            skillGapId: g.id,
            week: i + 1,
            description: `Learn ${g.skillName}`,
            resourceUrl: `https://example.com/learn/${i + 1}`,
          })),
        },
      },
    });
  }

  return { scorecardId: scorecard.id, discrepancyIds };
}

// ------------------------------------------------------------
// Files
// ------------------------------------------------------------

export function loadSeed(
  type: 'transcripts' | 'resumes',
  filename: string,
): string {
  const filePath = join(__dirname, '..', '..', 'prisma', 'seed', type, `${filename}.txt`);
  return readFileSync(filePath, 'utf-8');
}

// ------------------------------------------------------------
// Polling
// ------------------------------------------------------------

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function waitForPipeline(
  fetchFn: () => Promise<any>,
  options: {
    maxAttempts?: number;
    intervalMs?: number;
    expectedStatus?: string;
    ignoreStatuses?: string[];
  } = {},
): Promise<any> {
  const {
    maxAttempts = 60,
    intervalMs = 2_000,
    expectedStatus = 'scored',
    ignoreStatuses = [],
  } = options;
  const terminal = ['scored', 'failed', 'needs_review', 'rejected'];

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const response = await fetchFn();

    if (terminal.includes(response.status) && !ignoreStatuses.includes(response.status)) {
      if (response.status !== expectedStatus) {
        throw new Error(
          `Pipeline ended with "${response.status}" but "${expectedStatus}" was expected. ` +
            `Server message: ${response.message ?? '(none)'}`,
        );
      }
      if (response.status === 'scored') await sleep(2_000);
      return response;
    }

    if (attempt === maxAttempts) {
      throw new Error(
        `Pipeline did not finish after ${maxAttempts} attempts. Last status: ${response.status}`,
      );
    }
    await sleep(intervalMs);
  }
}

// ------------------------------------------------------------
// Retry wrapper for slow/flaky internet
// ------------------------------------------------------------

export async function runPipelineWithRetry(
  uploadFn: (uniqueEmail: string) => Promise<string>,
  pollFn: (id: string) => Promise<any>,
  retries = 2,
): Promise<{ interviewId: string; scorecard: any }> {
  let lastError: unknown;

  for (let i = 0; i <= retries; i++) {
    const uniqueEmail = `retry.${Date.now()}.${i}.${Math.random().toString(36).slice(2)}@example.com`;
    const interviewId = await uploadFn(uniqueEmail);

    try {
      const scorecard = await pollFn(interviewId);
      return { interviewId, scorecard };
    } catch (err: any) {
      lastError = err;
      if (!String(err?.message).includes('"failed"')) throw err;
      console.warn(
        `[retry] pipeline failed (attempt ${i + 1}/${retries + 1}), re-uploading...`,
      );
    }
  }

  throw lastError;
}

// ------------------------------------------------------------
// Bulk upload helpers
// ------------------------------------------------------------

export function attachBulkFiles(
  req: any,
  files: { filename: string; content: string | Buffer }[],
) {
  for (const f of files) {
    req.attach(
      'files',
      Buffer.isBuffer(f.content) ? f.content : Buffer.from(f.content),
      f.filename,
    );
  }
  return req;
}

export function validBulkPair(suffix: string) {
  return {
    transcript: {
      filename: `transcript-${suffix}.txt`,
      content: SHORT_TRANSCRIPT,
    },
    resume: {
      filename: `resume-${suffix}.txt`,
      content: SHORT_CV,
    },
    metadata: {
      candidateName: `Bulk Candidate ${suffix}`,
      candidateEmail: `bulk.${suffix}@example.com`,
      transcriptFileName: `transcript-${suffix}.txt`,
      resumeFileName: `resume-${suffix}.txt`,
    },
  };
}