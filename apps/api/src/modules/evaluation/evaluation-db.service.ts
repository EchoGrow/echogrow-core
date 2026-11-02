import { Injectable, Logger } from '@nestjs/common';
import { Evaluation } from '@echogrow/shared';
import { PrismaService } from '../prisma/prisma.service';

const STATUS_MAP = {
  queued: 'QUEUED',
  processing: 'PROCESSING',
  scored: 'SCORED',
  failed: 'FAILED',
} as const;

const DIMENSION_MAP: Record<string, 'TECHNICAL_DEPTH' | 'COMMUNICATION' | 'DOMAIN_EXPERIENCE' | 'PROBLEM_SOLVING'> = {
  'Technical Depth': 'TECHNICAL_DEPTH',
  'Communication Clarity': 'COMMUNICATION',
  'Domain Experience': 'DOMAIN_EXPERIENCE',
  'Problem Solving': 'PROBLEM_SOLVING',
};

@Injectable()
export class EvaluationDbService {
  private readonly logger = new Logger(EvaluationDbService.name);

  constructor(private readonly prisma: PrismaService) {}

  getInterviewSession(id: string) {
    return this.prisma.interviewSession.findUnique({
      where: { id },
      include: { candidate: true },
    });
  }

  async updateSessionStatus(
    id: string,
    status: keyof typeof STATUS_MAP,
    errorMessage?: string,
  ): Promise<void> {
    if (errorMessage) this.logger.error(`Session ${id} -> ${status}: ${errorMessage}`);
    await this.prisma.interviewSession.update({
      where: { id },
      data: { status: STATUS_MAP[status] },
    });
  }

  async saveScorecardAndDimensions(
    interviewId: string,
    evaluation: Evaluation,
  ): Promise<{ scorecardId: string }> {
    const dims = evaluation.dimensions;
    const overallScore = dims.reduce((sum, d) => sum + d.score, 0) / dims.length;

    return this.prisma.$transaction(async (tx) => {
      // Makes BullMQ retries idempotent (interviewId is unique on Scorecard)
      await tx.scorecard.deleteMany({ where: { interviewId } });

      const scorecard = await tx.scorecard.create({
        data: {
          interviewId,
          overallScore,
          confidence: evaluation.overallConfidence,
          dimensions: {
            create: dims.map((d) => ({
              dimensionType: DIMENSION_MAP[d.name],
              score: d.score,
              reason: d.reason,
              evidenceQuote: {
                quote: d.evidenceQuote,
                timestamp: d.timestamp,
                speaker: 'Candidate',
              },
            })),
          },
        },
      });
      return { scorecardId: scorecard.id };
    });
  }
}