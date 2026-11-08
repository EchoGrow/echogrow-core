import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  CreateInterviewSchema,
  DiscrepancySchema,
  RoadmapResponseSchema,
  ScorecardSchema,
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

@Injectable()
export class InterviewsService {
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
    const transcriptHash = createHash('sha256').update(transcript).digest('hex');
    const resumeHash = createHash('sha256').update(cv).digest('hex');

    let candidate = await this.prisma.candidate.findUnique({ where: { email: candidateEmail } });
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
      },
    });

    await this.evaluationQueue.add(
      'evaluate',
      { interviewId: session.id },
      {
        attempts: 1,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
      },
    );

    return { interviewId: session.id, status: 'queued' };
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
      return {
        status: 'processing',
        interviewId: session.id,
        candidateName: session.candidate.name,
        progress: {
          isScored: session.isScored,
          isVerified: session.isVerified,
          isPlanned: session.isPlanned,
        },
      };
    }

    const pendingDiscrepancies = await this.prisma.discrepancy.count({
      where: { scorecardId: session.scorecard.id, status: 'PENDING' },
    });

    const skillGaps = session.scorecard.roadmap
      ? await this.prisma.roadmapItem.count({
          where: { roadmapId: session.scorecard.roadmap.id },
        })
      : 0;

    const totalDiscrepancies = session.scorecard.discrepancies.length;
    const weakDimensionsCount = session.scorecard.dimensions.filter((d) => d.score <= 2).length;

    // ============================================================
    // Time Saved — read from DB (snapshot), fallback to on-the-fly
    // ============================================================
    let timeSaved:
      | {
          manualMinutes: number;
          echoGrowSeconds: number;
          savedMinutes: number;
          savedSeconds: number;
        }
      | undefined;

    if (
      session.manualReviewMinutes !== null &&
      session.echoGrowSeconds !== null &&
      session.savedMinutes !== null
    ) {
      const savedSeconds = Math.max(
        0,
        Math.round(session.manualReviewMinutes * 60 - session.echoGrowSeconds),
      );
      timeSaved = {
        manualMinutes: session.manualReviewMinutes,
        echoGrowSeconds: session.echoGrowSeconds,
        savedMinutes: session.savedMinutes,
        savedSeconds,
      };
    } else if (session.status === 'COMPLETED') {
      timeSaved = this.computeTimeSavedFallback(
        {
          createdAt: session.createdAt,
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
      skillGaps,
      timeSaved,
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
      discrepancies: (session.scorecard?.discrepancies ?? []).map((discrepancy) => ({
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
      })),
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

  // ============================================================
  // Fallback for old sessions (pre-snapshot). Computed on-the-fly.
  // ============================================================
  private computeTimeSavedFallback(
    session: { createdAt: Date; updatedAt: Date; transcript: string; resume: string },
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

    const countWords = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

    const manualMinutes =
      C.BASE_MINUTES +
      countWords(session.transcript) / C.TRANSCRIPT_WPM +
      countWords(session.resume) / C.CV_WPM +
      discrepanciesCount * C.MINUTES_PER_DISCREPANCY +
      weakDimensionsCount * C.MINUTES_PER_WEAK_DIMENSION;

    const rawSeconds = Math.max(0, (session.updatedAt.getTime() - session.createdAt.getTime()) / 1000);
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