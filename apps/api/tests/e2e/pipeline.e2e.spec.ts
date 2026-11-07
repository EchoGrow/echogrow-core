import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/modules/prisma/prisma.service';
import {
  createTestApp,
  closeTestApp,
  loadSeed,
  waitForPipeline,
  runPipelineWithRetry,
} from './setup';
import { whitelist } from '@echogrow/shared';

describe('E2E: Full Pipeline — Seed Scenarios', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const api = () => request(app.getHttpServer());

  const approvedUrls = new Set<string>();
  for (const skill of whitelist) {
    for (const resource of skill.resources) {
      approvedUrls.add(resource.resourceUrl);
    }
  }

  const poll = (id: string, options = {}) =>
    waitForPipeline(
      async () => (await api().get(`/interviews/${id}/scorecard`).expect(200)).body,
      { maxAttempts: 120, intervalMs: 2_000, ...options },
    );

  const upload = async (
    name: string,
    email: string,
    transcriptFile: string,
    cvFile: string,
  ) => {
    const res = await api()
      .post('/interviews/upload')
      .send({
        candidateName: name,
        candidateEmail: email,
        transcript: loadSeed('transcripts', transcriptFile),
        cv: loadSeed('resumes', cvFile),
      })
      .expect(201);
    expect(res.body.interviewId).toBeTruthy();
    expect(res.body.status).toBe('queued');
    return res.body.interviewId as string;
  };

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  afterAll(async () => {
    await closeTestApp(app, prisma);
  });

  // ============================================================
  // Scenario 1: Clean candidate (Maya Lin)
  // ============================================================
  describe('Scenario 1: Clean Candidate (Maya Lin)', () => {
    let interviewId: string;

    it('uploads and completes the pipeline', async () => {
      const result = await runPipelineWithRetry(
        (uniqueEmail) =>
          upload('Maya Lin', uniqueEmail, 'clean_interview', 'clean_resume'),
        (id) => poll(id),
      );
      interviewId = result.interviewId;
      console.log(
        `[S1] status=${result.scorecard.status} candidate=${result.scorecard.candidateName}`,
      );
      expect(result.scorecard.status).toBe('scored');
      expect(result.scorecard.candidateName).toBe('Maya Lin');
    }, 600_000);

    it('creates 4 dimensions with high scores and evidence', async () => {
      const { body } = await api().get(`/interviews/${interviewId}/scorecard`).expect(200);
      console.log(
        `[S1] dimensions:`,
        body.dimensions.map((d: any) => ({ name: d.name, score: d.score })),
      );
      expect(body.dimensions).toHaveLength(4);
      for (const dim of body.dimensions) {
        expect(dim.score).toBeGreaterThanOrEqual(3);
        expect(dim.score).toBeLessThanOrEqual(5);
        expect(dim.evidenceQuote).toBeTruthy();
      }
      expect(body.overallConfidence).toBeGreaterThanOrEqual(0);
      expect(body.overallConfidence).toBeLessThanOrEqual(1);
      expect(body.skillGaps).toBe(0);
    });

    it('detects no serious discrepancies (LLM may flag minor wording)', async () => {
      const { body } = await api().get(`/interviews/${interviewId}/discrepancies`).expect(200);
      console.log(
        `[S1] discrepancies=${body.discrepancies.length}`,
        body.discrepancies.map((d: any) => d.field),
      );
      expect(body.discrepancies.length).toBeLessThanOrEqual(1);
    });

    it('generates 0 gaps and an empty roadmap', async () => {
      const { body } = await api().get(`/interviews/${interviewId}/roadmap`).expect(200);
      console.log(`[S1] gaps=${body.gaps.length} roadmapWeeks=${body.roadmap.length}`);
      expect(body.gaps).toEqual([]);
      expect(body.roadmap).toEqual([]);
    });

    it('persists everything correctly', async () => {
      const session = await prisma.interviewSession.findUnique({
        where: { id: interviewId },
        include: {
          scorecard: {
            include: {
              dimensions: true,
              discrepancies: true,
              roadmap: { include: { items: true } },
            },
          },
        },
      });
      expect(session?.status).toBe('COMPLETED');
      expect(session?.isScored).toBe(true);
      expect(session?.isVerified).toBe(true);
      expect(session?.isPlanned).toBe(true);
      expect(Array.isArray(session?.structuredTranscript)).toBe(true);
      expect(session?.scorecard?.dimensions).toHaveLength(4);
      expect(session?.scorecard?.discrepancies.length).toBeLessThanOrEqual(1);
      expect(session?.scorecard?.roadmap).toBeNull();
    });
  });

  // ============================================================
  // Scenario 2: Contradiction (Ahmed)
  // ============================================================
  describe('Scenario 2: Contradiction (Ahmed Al-Mansoor)', () => {
    let interviewId: string;

    it('uploads and completes the pipeline', async () => {
      const result = await runPipelineWithRetry(
        (uniqueEmail) =>
          upload(
            'Ahmed Al-Mansoor',
            uniqueEmail,
            'contradiction_interview',
            'contradiction_resume',
          ),
        (id) => poll(id),
      );
      interviewId = result.interviewId;
      console.log(`[S2] status=${result.scorecard.status}`);
      expect(result.scorecard.status).toBe('scored');
    }, 600_000);

    it('creates 4 valid dimensions', async () => {
      const { body } = await api().get(`/interviews/${interviewId}/scorecard`).expect(200);
      console.log(
        `[S2] dimensions:`,
        body.dimensions.map((d: any) => ({ name: d.name, score: d.score })),
      );
      expect(body.dimensions).toHaveLength(4);
      for (const dim of body.dimensions) {
        expect(dim.score).toBeGreaterThanOrEqual(1);
        expect(dim.score).toBeLessThanOrEqual(5);
        expect(dim.evidenceQuote).toBeTruthy();
      }
    });

    it('detects at least 1 discrepancy with a valid shape', async () => {
      const { body } = await api().get(`/interviews/${interviewId}/discrepancies`).expect(200);
      console.log(`[S2] discrepancies=${body.discrepancies.length}`);
      console.log(`[S2] fields:`, body.discrepancies.map((d: any) => d.field));
      expect(body.discrepancies.length).toBeGreaterThanOrEqual(1);

      for (const d of body.discrepancies) {
        expect(d.id).toBeTruthy();
        expect(d.field).toBeTruthy();
        expect(d.status).toBe('pending');
        expect(d.action).toBe('flag_for_human_review');
        expect(d.confidence).toBeGreaterThanOrEqual(0);
        expect(d.confidence).toBeLessThanOrEqual(1);
        expect(d.cvQuote || d.interviewQuote).toBeTruthy();
      }
    });

    it('scorecard summary matches discrepancies and gaps', async () => {
      const sc = (await api().get(`/interviews/${interviewId}/scorecard`).expect(200)).body;
      const disc = (await api().get(`/interviews/${interviewId}/discrepancies`).expect(200)).body;
      const rm = (await api().get(`/interviews/${interviewId}/roadmap`).expect(200)).body;
      expect(sc.pendingDiscrepancies).toBe(disc.discrepancies.length);
      expect(sc.skillGaps).toBe(rm.gaps.length);
    });

    it('allows confirming a discrepancy', async () => {
      const { body } = await api().get(`/interviews/${interviewId}/discrepancies`).expect(200);
      const first = body.discrepancies[0];

      const patch = await api()
        .patch(`/discrepancies/${first.id}`)
        .send({ status: 'confirmed' })
        .expect(200);
      expect(patch.body.status).toBe('CONFIRMED');
      expect(patch.body.reviewedAt).toBeTruthy();

      const db = await prisma.discrepancy.findUnique({ where: { id: first.id } });
      expect(db?.status).toBe('CONFIRMED');
      expect(db?.reviewedAt).toBeTruthy();
    });

    it('generates a consistent roadmap (N weeks = N gaps)', async () => {
      const { body } = await api().get(`/interviews/${interviewId}/roadmap`).expect(200);
      console.log(
        `[S2] gaps=${body.gaps.map((g: any) => g.skillName).join(', ') || '(none)'}`,
      );

      // Invariant: roadmap weeks always equal the number of gaps (0 is legal).
      expect(body.roadmap).toHaveLength(body.gaps.length);

      body.roadmap.forEach((item: any, i: number) => {
        expect(item.week).toBe(i + 1);
        expect(item.task).toBeTruthy();
        expect(item.skillName).toBeTruthy();
        expect(item.resourceUrl).toMatch(/^https?:\/\//);
      });

      if (body.gaps.length === 0) {
        console.warn(
          '[S2] WARNING: LLM extracted 0 gaps for Ahmed (expected >= 1). Check dimension scores.',
        );
      }
    });

    it('QUALITY: weak candidate should yield at least 1 skill gap', async () => {
      const { body } = await api().get(`/interviews/${interviewId}/roadmap`).expect(200);
      expect(body.gaps.length).toBeGreaterThanOrEqual(1);
    });

    it('only uses whitelisted URLs (Google fallback allowed)', async () => {
      const { body } = await api().get(`/interviews/${interviewId}/roadmap`).expect(200);
      const fallback = /^https:\/\/www\.google\.com\/search\?q=/;

      for (const item of body.roadmap) {
        if (fallback.test(item.resourceUrl)) {
          console.warn(`[S2] fallback used for "${item.skillName}"`);
          continue;
        }
        expect(approvedUrls.has(item.resourceUrl)).toBe(true);
      }
    });

    it('persists everything correctly', async () => {
      const session = await prisma.interviewSession.findUnique({
        where: { id: interviewId },
        include: {
          scorecard: {
            include: {
              dimensions: true,
              discrepancies: true,
              roadmap: { include: { items: true } },
            },
          },
        },
      });
      expect(session?.status).toBe('COMPLETED');
      expect(session?.isScored).toBe(true);
      expect(session?.isVerified).toBe(true);
      expect(session?.isPlanned).toBe(true);
      expect(session?.scorecard?.dimensions).toHaveLength(4);
      expect(session?.scorecard?.discrepancies.length).toBeGreaterThanOrEqual(1);

      // Roadmap may be null if the LLM found no gaps (legal behavior).
      const items = session?.scorecard?.roadmap?.items ?? [];
      const gapsCount = await prisma.skillGap.count({
        where: { dimension: { scorecardId: session?.scorecard?.id } },
      });
      expect(items.length).toBe(gapsCount);
    });
  });

  // ============================================================
  // Scenario 3: Low quality (Jordan) -> NEEDS_REVIEW -> force-evaluate
  // ============================================================
  describe('Scenario 3: Low-Quality (Jordan Reed) + force-evaluate', () => {
    let interviewId: string;

    it('routes to NEEDS_REVIEW (low confidence)', async () => {
      interviewId = await upload(
        'Jordan Reed',
        `jordan.${Date.now()}@example.com`,
        'low_quality_interview',
        'low_quality_resume',
      );
      const scorecard = await poll(interviewId, { expectedStatus: 'needs_review' });

      console.log(`[S3] confidence=${scorecard.confidence}`);
      expect(scorecard.status).toBe('needs_review');
      expect(scorecard.confidence).toBeLessThan(0.6);
      expect(scorecard.transcript).toBeTruthy();
      expect(scorecard.resume).toBeTruthy();
      expect(Array.isArray(scorecard.structuredTranscript)).toBe(true);
    }, 300_000);

    it('does not create a scorecard and leaves flags false', async () => {
      const session = await prisma.interviewSession.findUnique({
        where: { id: interviewId },
        include: { scorecard: true },
      });
      expect(session?.status).toBe('NEEDS_REVIEW');
      expect(session?.scorecard).toBeNull();
      expect(session?.isScored).toBe(false);
      expect(session?.isVerified).toBe(false);
      expect(session?.isPlanned).toBe(false);
    });

    it('force-evaluate runs the full pipeline to COMPLETED', async () => {
      const res = await api().post(`/interviews/${interviewId}/force-evaluate`).expect(201);
      expect(res.body.status).toBe('queued');

      await poll(interviewId, {
        expectedStatus: 'scored',
        ignoreStatuses: ['needs_review'],
      });

      const session = await prisma.interviewSession.findUnique({
        where: { id: interviewId },
        include: { scorecard: { include: { dimensions: true } } },
      });
      expect(session?.status).toBe('COMPLETED');
      expect(session?.scorecard?.dimensions).toHaveLength(4);
    }, 600_000);
  });

  // ============================================================
  // Scenario 4: Low quality -> reject
  // ============================================================
  describe('Scenario 4: Low-Quality then Reject', () => {
    it('rejects an interview in NEEDS_REVIEW', async () => {
      const id = await upload(
        'Jordan Reject',
        `jordan.reject.${Date.now()}@example.com`,
        'low_quality_interview',
        'low_quality_resume',
      );
      await poll(id, { expectedStatus: 'needs_review' });

      const res = await api().post(`/interviews/${id}/reject`).expect(201);
      expect(res.body.status).toBe('rejected');

      const sc = (await api().get(`/interviews/${id}/scorecard`).expect(200)).body;
      expect(sc.status).toBe('rejected');

      const db = await prisma.interviewSession.findUnique({ where: { id } });
      expect(db?.status).toBe('REJECTED');

      await api().post(`/interviews/${id}/reject`).expect(400);
      await api().post(`/interviews/${id}/force-evaluate`).expect(400);
    }, 300_000);
  });
});