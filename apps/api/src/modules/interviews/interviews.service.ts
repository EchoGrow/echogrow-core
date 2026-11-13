import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  CreateInterviewSchema,
  DiscrepancySchema,
  RoadmapResponseSchema,
  ScorecardSchema,
  BulkUploadMetadataSchema,
  BulkUploadResult,
  type InterviewListItem,
  type InterviewListResponse,
} from '@echogrow/shared';
import { createHash } from 'crypto';
import { TranscriptParserService } from '../evaluation/transcript-parser.service';

const DIMENSION_NAME_MAP = {
  TECHNICAL_DEPTH: 'Technical Depth',
  COMMUNICATION: 'Communication Clarity',
  DOMAIN_EXPERIENCE: 'Domain Experience',
  PROBLEM_SOLVING: 'Problem Solving',
} as const;

const DISCREPANCY_STATUS_MAP = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  DISMISSED: 'dismissed',
} as const;

const MAX_FILE_BYTES = 2 * 1024 * 1024;

function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

@Injectable()
export class InterviewsService {
  private readonly logger = new Logger(InterviewsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly parser: TranscriptParserService,
    @InjectQueue('evaluation') private readonly evaluationQueue: Queue,
  ) {}

  async upload(data: any) {
    const parsed = CreateInterviewSchema.safeParse(data);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues.map((e: any) => e.message).join(', '));
    }

    const { candidateName, candidateEmail, transcript, cv } = parsed.data;
    const interviewId = await this.createInterviewAndEnqueue(
      candidateName,
      candidateEmail,
      transcript,
      cv,
    );

    return { interviewId, status: 'queued' };
  }

  private async createInterviewAndEnqueue(
    candidateName: string,
    candidateEmail: string,
    transcript: string,
    cv: string,
  ): Promise<string> {
    const transcriptHash = createHash('sha256').update(transcript).digest('hex');
    const resumeHash = createHash('sha256').update(cv).digest('hex');

    let candidate = await this.prisma.candidate.findUnique({
      where: { email: candidateEmail },
    });
    if (!candidate) {
      candidate = await this.prisma.candidate.create({
        data: { name: candidateName, email: candidateEmail },
      });
    }

    const session = await this.prisma.interviewSession.create({
      data: {
        candidateId: candidate.id,
        transcript,
        transcriptHash,
        resume: cv,
        resumeHash,
        status: 'QUEUED',
        isScored: false,
        isVerified: false,
        isPlanned: false,
        spkStatus: 'pending',
      },
    });

    await this.evaluationQueue.add(
      'evaluate',
      { interviewId: session.id },
      {
        attempts: 1,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
        delay: 2000,
      },
    );

    return session.id;
  }

  async bulkUpload(files: Express.Multer.File[], metadataRaw: unknown) {
    const parsed = BulkUploadMetadataSchema.safeParse(metadataRaw);
    if (!parsed.success) {
      throw new BadRequestException(
        'Invalid metadata: ' +
          parsed.error.issues
            .map((e) => `${e.path.join('.')}: ${e.message}`)
            .join(', '),
      );
    }

    const metadata = parsed.data;

    const rejectedFiles: { filename: string; reason: string; sizeBytes: number }[] = [];
    const acceptedFiles: Express.Multer.File[] = [];

    for (const file of files) {
      if (file.size === 0) {
        rejectedFiles.push({
          filename: file.originalname,
          reason: 'File is empty (0 bytes).',
          sizeBytes: 0,
        });
        continue;
      }

      if (file.size > MAX_FILE_BYTES) {
        const sizeMb = (file.size / 1024 / 1024).toFixed(2);
        const limitMb = (MAX_FILE_BYTES / 1024 / 1024).toFixed(2);
        rejectedFiles.push({
          filename: file.originalname,
          reason: `File is too large (${sizeMb} MB). Maximum is ${limitMb} MB per file.`,
          sizeBytes: file.size,
        });
        continue;
      }

      acceptedFiles.push(file);
    }

    const fileMap = new Map<string, Express.Multer.File>();
    for (const file of acceptedFiles) {
      fileMap.set(file.originalname, file);
      fileMap.set(file.originalname.toLowerCase(), file);

      const sanitized = sanitizeFilename(file.originalname);
      if (!fileMap.has(sanitized)) {
        fileMap.set(sanitized, file);
      }
    }

    const results: BulkUploadResult[] = [];

    for (const candidate of metadata) {
      try {
        const sanitizedTranscript = sanitizeFilename(candidate.transcriptFileName);
        const transcriptFile =
          fileMap.get(sanitizedTranscript) ??
          fileMap.get(candidate.transcriptFileName) ??
          fileMap.get(candidate.transcriptFileName.toLowerCase());

        if (!transcriptFile) {
          results.push({
            candidateName: candidate.candidateName,
            candidateEmail: candidate.candidateEmail,
            status: 'error',
            error: `Transcript file "${candidate.transcriptFileName}" was not uploaded or was rejected (see rejectedFiles).`,
          });
          continue;
        }

        const sanitizedResume = sanitizeFilename(candidate.resumeFileName);
        const resumeFile =
          fileMap.get(sanitizedResume) ??
          fileMap.get(candidate.resumeFileName) ??
          fileMap.get(candidate.resumeFileName.toLowerCase());

        if (!resumeFile) {
          results.push({
            candidateName: candidate.candidateName,
            candidateEmail: candidate.candidateEmail,
            status: 'error',
            error: `Resume file "${candidate.resumeFileName}" was not uploaded or was rejected (see rejectedFiles).`,
          });
          continue;
        }

        const transcript = transcriptFile.buffer.toString('utf-8');
        const cv = resumeFile.buffer.toString('utf-8');

        if (transcript.trim().length < 40) {
          results.push({
            candidateName: candidate.candidateName,
            candidateEmail: candidate.candidateEmail,
            status: 'error',
            error: `Transcript is too short (< 40 chars). Found ${transcript.trim().length} chars.`,
          });
          continue;
        }

        if (cv.trim().length < 20) {
          results.push({
            candidateName: candidate.candidateName,
            candidateEmail: candidate.candidateEmail,
            status: 'error',
            error: `Resume is too short (< 20 chars). Found ${cv.trim().length} chars.`,
          });
          continue;
        }

        const interviewId = await this.createInterviewAndEnqueue(
          candidate.candidateName,
          candidate.candidateEmail,
          transcript,
          cv,
        );

        results.push({
          candidateName: candidate.candidateName,
          candidateEmail: candidate.candidateEmail,
          status: 'queued',
          interviewId,
        });
      } catch (cause: any) {
        results.push({
          candidateName: candidate.candidateName,
          candidateEmail: candidate.candidateEmail,
          status: 'error',
          error: cause instanceof Error ? cause.message : 'Unknown error',
        });
      }
    }

    const queued = results.filter((r) => r.status === 'queued').length;
    const failed = results.filter((r) => r.status === 'error').length;

    return {
      results,
      rejectedFiles,
      summary: {
        total: results.length,
        queued,
        failed,
        rejectedFilesCount: rejectedFiles.length,
      },
    };
  }

  async getScorecard(interviewId: string) {
    const session = await this.prisma.interviewSession.findUnique({
      where: { id: interviewId },
      include: {
        candidate: true,
        scorecard: {
          include: {
            dimensions: true,
            discrepancies: { select: { id: true, status: true } },
            roadmap: { include: { items: true } },
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Interview session not found.');
    }

    if (session.status === 'NEEDS_REVIEW') {
      const confidence = this.parser.calculateConfidence(session.transcript);
      return {
        status: 'needs_review',
        interviewId: session.id,
        candidateName: session.candidate.name,
        transcript: session.transcript,
        resume: session.resume,
        structuredTranscript: session.structuredTranscript,
        confidence,
        message: 'Low-confidence transcript. Manual review required.',
      };
    }

    if (session.status === 'REJECTED') {
      return {
        status: 'rejected',
        interviewId: session.id,
        candidateName: session.candidate.name,
        message: 'This interview was rejected during manual review.',
      };
    }

    if (session.status === 'FAILED') {
      return {
        status: 'failed',
        interviewId: session.id,
        candidateName: session.candidate.name,
        message: 'The analysis failed. You can retry or start a new analysis.',
      };
    }

    if (session.status !== 'COMPLETED' || !session.scorecard) {
      const isQueued = session.status === 'QUEUED';
      return {
        status: 'processing',
        interviewId: session.id,
        candidateName: session.candidate.name,
        progress: {
          isScored: session.isScored,
          isVerified: session.isVerified,
          isPlanned: session.isPlanned,
        },
        isQueued,
      };
    }

    const pendingDiscrepancies = await this.prisma.discrepancy.count({
      where: { scorecardId: session.scorecard.id, status: 'PENDING' },
    });

    const totalDiscrepancies = session.scorecard.discrepancies.length;

    const skillGaps = session.scorecard.roadmap
      ? await this.prisma.roadmapItem.count({
          where: { roadmapId: session.scorecard.roadmap.id },
        })
      : 0;

    const weakDimensionsCount = session.scorecard.dimensions.filter((d) => d.score <= 2).length;

    let timeSaved:
      | {
          manualMinutes: number;
          echoGrowSeconds: number;
          savedMinutes: number;
          savedSeconds: number;
        }
      | undefined;

    if (
      (session as any).manualReviewMinutes != null &&
      (session as any).echoGrowSeconds != null &&
      (session as any).savedMinutes != null
    ) {
      const savedSeconds = Math.max(
        0,
        Math.round((session as any).manualReviewMinutes * 60 - (session as any).echoGrowSeconds),
      );
      timeSaved = {
        manualMinutes: (session as any).manualReviewMinutes,
        echoGrowSeconds: (session as any).echoGrowSeconds,
        savedMinutes: (session as any).savedMinutes,
        savedSeconds,
      };
    } else if (session.status === 'COMPLETED') {
      timeSaved = this.computeTimeSavedFallback(
        {
          createdAt: session.createdAt,
          completedAt: (session as any).completedAt ?? session.updatedAt,
          updatedAt: session.updatedAt,
          transcript: session.transcript,
          resume: session.resume,
        },
        totalDiscrepancies,
        weakDimensionsCount,
      );
    }

    const response = {
      status: 'scored',
      interviewId: session.id,
      candidateName: session.candidate.name,
      interviewDate: session.createdAt.toISOString(),
      dimensions: session.scorecard.dimensions.map((dimension) => {
        const evidenceQuote = dimension.evidenceQuote as any;
        return {
          name: DIMENSION_NAME_MAP[dimension.dimensionType],
          score: dimension.score,
          reason: dimension.reason ?? 'No reason provided.',
          evidenceQuote: evidenceQuote?.quote ?? '',
          timestamp: evidenceQuote?.timestamp ?? undefined,
        };
      }),
      overallConfidence: session.scorecard.confidence ?? 0,
      pendingDiscrepancies,
      totalDiscrepancies,
      skillGaps,
      timeSaved,
      spkStatus: (session as any).spkStatus ?? 'pending',
      spkError: (session as any).spkError ?? null,
    };

    return ScorecardSchema.parse(response);
  }

  async forceEvaluation(interviewId: string) {
    const session = await this.prisma.interviewSession.findUnique({
      where: { id: interviewId },
    });

    if (!session) {
      throw new NotFoundException('Interview session not found.');
    }

    if (session.status !== 'NEEDS_REVIEW' && session.status !== 'FAILED') {
      throw new BadRequestException('This interview cannot be re-evaluated.');
    }

    await this.prisma.interviewSession.update({
      where: { id: interviewId },
      data: {
        status: 'QUEUED',
        isScored: false,
        isVerified: false,
        isPlanned: false,
        spkStatus: 'pending',
        spkError: null,
      },
    });

    await this.evaluationQueue.add(
      'evaluate',
      { interviewId, force: true },
      {
        attempts: 1,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
      },
    );

    return { interviewId, status: 'queued' };
  }

  async rejectInterview(interviewId: string) {
    const session = await this.prisma.interviewSession.findUnique({
      where: { id: interviewId },
    });

    if (!session) {
      throw new NotFoundException('Interview session not found.');
    }

    if (session.status !== 'NEEDS_REVIEW') {
      throw new BadRequestException('Only interviews in needs_review can be rejected.');
    }

    await this.prisma.interviewSession.update({
      where: { id: interviewId },
      data: { status: 'REJECTED' },
    });

    return { interviewId, status: 'rejected' };
  }

  async getDiscrepancies(interviewId: string) {
    const session = await this.prisma.interviewSession.findUnique({
      where: { id: interviewId },
      include: {
        scorecard: {
          include: {
            discrepancies: { orderBy: { createdAt: 'asc' } },
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Interview session not found.');
    }

    const response = {
      discrepancies: (session.scorecard?.discrepancies ?? []).map(
        (discrepancy) => ({
          id: discrepancy.id,
          field: discrepancy.claim,
          cvSays: discrepancy.cvQuote ?? 'Not provided',
          interviewSays: discrepancy.interviewQuote ?? 'Not provided',
          cvQuote: discrepancy.cvQuote ?? undefined,
          interviewQuote: discrepancy.interviewQuote ?? undefined,
          confidence: discrepancy.confidence ?? 0,
          status:
            DISCREPANCY_STATUS_MAP[
              discrepancy.status as keyof typeof DISCREPANCY_STATUS_MAP
            ] || 'pending',
          action: 'flag_for_human_review' as const,
          severity: discrepancy.severity.toLowerCase(),
          reviewerNotes: discrepancy.reviewerNotes,
        }),
      ),
    };

    return DiscrepancySchema.parse(response);
  }

  async getRoadmap(interviewId: string) {
    const session = await this.prisma.interviewSession.findUnique({
      where: { id: interviewId },
      include: {
        scorecard: {
          include: {
            dimensions: { include: { skillGaps: true } },
            roadmap: {
              include: {
                items: {
                  include: { skillGap: true },
                  orderBy: { week: 'asc' },
                },
              },
            },
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Interview session not found.');
    }

    if (!session.scorecard) {
      throw new NotFoundException('Roadmap not found.');
    }

    const gaps = session.scorecard.dimensions.flatMap((dimension) =>
      dimension.skillGaps.map((gap) => ({
        skillName: gap.skillName,
        priority: gap.priority,
      })),
    );

    if (gaps.length === 0) {
      return RoadmapResponseSchema.parse({ gaps: [], roadmap: [] });
    }

    const savedRoadmap = session.scorecard.roadmap;

    if (!savedRoadmap) {
      throw new NotFoundException('Roadmap not found.');
    }

    const response = {
      gaps,
      roadmap: savedRoadmap.items.map((item) => ({
        week: item.week,
        task: item.description,
        resourceUrl: item.resourceUrl,
        skillName: item.skillGap.skillName,
      })),
    };

    return RoadmapResponseSchema.parse(response);
  }

  async findAllCompleted(): Promise<InterviewListResponse> {
    const sessions = await this.prisma.interviewSession.findMany({
      where: { status: 'COMPLETED' },
      include: {
        candidate: { select: { name: true, email: true } },
        scorecard: {
          include: {
            dimensions: { select: { score: true } },
            discrepancies: { select: { status: true } },
            roadmap: {
              select: {
                items: { select: { id: true } },
              },
            },
          },
        },
      },
      orderBy: { completedAt: 'desc' },
      take: 200,
    });

    const interviews: InterviewListItem[] = sessions
      .filter((s) => s.scorecard)
      .map((s) => {
        const dims = s.scorecard!.dimensions;
        const overallScore =
          dims.length > 0
            ? Math.round(
                (dims.reduce((sum, d) => sum + d.score, 0) / dims.length) * 10,
              ) / 10
            : null;

        return {
          id: s.id,
          candidateName: s.candidate.name,
          candidateEmail: s.candidate.email,
          completedAt: s.completedAt?.toISOString() ?? null,
          overallScore,
          pendingDiscrepancies: s.scorecard!.discrepancies.filter(
            (d) => d.status === 'PENDING',
          ).length,
          totalDiscrepancies: s.scorecard!.discrepancies.length,
          skillGaps: s.scorecard!.roadmap?.items.length ?? 0,
        };
      });

    this.logger.log(`Found ${interviews.length} completed interviews`);
    return { interviews, total: interviews.length };
  }

  private computeTimeSavedFallback(
    session: {
      createdAt: Date;
      completedAt?: Date;
      updatedAt: Date;
      transcript: string;
      resume: string;
    },
    discrepanciesCount: number,
    weakDimensionsCount: number,
  ) {
    const C = {
      BASE_MINUTES: 5,
      TRANSCRIPT_WPM: 150,
      CV_WPM: 200,
      MINUTES_PER_DISCREPANCY: 3,
      MINUTES_PER_WEAK_DIMENSION: 4,
      ECHOGROW_CAP_SECONDS: 180,
    };

    const countWords = (text: string) =>
      text.trim().split(/\s+/).filter(Boolean).length;

    const manualMinutes =
      C.BASE_MINUTES +
      countWords(session.transcript) / C.TRANSCRIPT_WPM +
      countWords(session.resume) / C.CV_WPM +
      discrepanciesCount * C.MINUTES_PER_DISCREPANCY +
      weakDimensionsCount * C.MINUTES_PER_WEAK_DIMENSION;

    const endTime = session.completedAt ?? session.updatedAt;
    const rawSeconds = Math.max(
      0,
      (endTime.getTime() - session.createdAt.getTime()) / 1000,
    );
    const echoGrowSeconds = Math.min(rawSeconds, C.ECHOGROW_CAP_SECONDS);
    const savedSeconds = Math.max(0, manualMinutes * 60 - echoGrowSeconds);

    return {
      manualMinutes: Math.round(manualMinutes * 10) / 10,
      echoGrowSeconds: Math.round(echoGrowSeconds),
      savedMinutes: savedSeconds < 60 ? 0 : Math.round((savedSeconds / 60) * 10) / 10,
      savedSeconds: Math.round(savedSeconds),
    };
  }
}