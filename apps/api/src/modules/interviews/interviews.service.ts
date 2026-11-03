import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { CreateInterviewSchema, ScorecardSchema } from '@echogrow/shared';
import { createHash } from 'crypto';
import { TranscriptParserService } from '../evaluation/transcript-parser.service';

const DIMENSION_NAME_MAP = {
  TECHNICAL_DEPTH: 'Technical Depth',
  COMMUNICATION: 'Communication Clarity',
  DOMAIN_EXPERIENCE: 'Domain Experience',
  PROBLEM_SOLVING: 'Problem Solving',
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
      },
    });

    await this.evaluationQueue.add(
      'evaluate',
      { interviewId: session.id },
      { attempts: 3, backoff: { type: 'exponential', delay: 2000 }, removeOnComplete: true },
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
            roadmap: {
              include: {
                items: true,
              },
            },
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

    if (!session.scorecard) {
      throw new BadRequestException('The interview is still processing. Scorecard is not available yet.');
    }

    const pendingDiscrepancies = await this.prisma.discrepancy.count({
      where: {
        scorecardId: session.scorecard.id,
        status: 'PENDING',
      },
    });

    const skillGaps = session.scorecard.roadmap
      ? await this.prisma.roadmapItem.count({
        where: {
          roadmapId: session.scorecard.roadmap.id,
        },
      })
      : 0;

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

    if (session.status !== 'NEEDS_REVIEW') {
      throw new BadRequestException('This interview is not in needs_review state.');
    }

    await this.prisma.interviewSession.update({
      where: { id: interviewId },
      data: { status: 'QUEUED' },
    });

    await this.evaluationQueue.add(
      'evaluate',
      { interviewId, force: true },
      { attempts: 3, backoff: { type: 'exponential', delay: 2000 }, removeOnComplete: true },
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
}