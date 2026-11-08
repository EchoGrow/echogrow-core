import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LlmService } from '../llm/llm.service';
import { EvaluationSchema } from '@echogrow/shared';
import { buildEvaluationPrompt } from './evaluation.prompts';

@Injectable()
export class EvaluationService {
  private readonly logger = new Logger(EvaluationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly llm: LlmService,
  ) {}

  async updateStatus(
    interviewId: string,
    status: 'PROCESSING' | 'SCORED' | 'COMPLETED' | 'FAILED' | 'NEEDS_REVIEW' | 'REJECTED',
  ) {
    await this.prisma.interviewSession.update({
      where: { id: interviewId },
      data: { status },
    });
  }

  async evaluate(transcript: string, resume: string): Promise<any> {
    const prompt = buildEvaluationPrompt(transcript, resume);
    return await this.llm.generate(prompt, EvaluationSchema);
  }

  /**
   * Idempotent: safe to call multiple times for the same interview.
   * If a scorecard exists, it deletes its dimensions and recreates them.
   */
  async saveScorecard(interviewId: string, evaluation: any): Promise<{ scorecardId: string }> {
    const overallScore =
      evaluation.dimensions.reduce((sum: number, d: any) => sum + d.score, 0) / 4;

    const dimensionsData = evaluation.dimensions.map((d: any) => ({
      dimensionType: this.mapDimensionType(d.name),
      score: d.score,
      reason: d.reason,
      evidenceQuote: {
        quote: d.evidenceQuote,
        timestamp: d.timestamp,
        speaker: 'Candidate',
      },
    }));

    const existing = await this.prisma.scorecard.findUnique({
      where: { interviewId },
      select: { id: true },
    });

    if (existing) {
      await this.prisma.dimension.deleteMany({ where: { scorecardId: existing.id } });

      const updated = await this.prisma.scorecard.update({
        where: { id: existing.id },
        data: {
          overallScore,
          confidence: evaluation.overallConfidence,
          dimensions: { create: dimensionsData },
        },
      });

      this.logger.log(`[Scorecard] Re-created for interview ${interviewId} (existing id reused)`);
      return { scorecardId: updated.id };
    }

    const scorecard = await this.prisma.scorecard.create({
      data: {
        interviewId,
        overallScore,
        confidence: evaluation.overallConfidence,
        dimensions: { create: dimensionsData },
      },
    });

    this.logger.log(`[Scorecard] Created for interview ${interviewId}`);
    return { scorecardId: scorecard.id };
  }

  /**
   * Computes and persists the time-saved snapshot for an interview.
   * Called once when the pipeline reaches COMPLETED.
   * Idempotent: safe to call multiple times (uses update).
   */
  async saveTimeSaved(
    interviewId: string,
    params: {
      transcript: string;
      resume: string;
      discrepanciesCount: number;
      weakDimensionsCount: number;
      createdAt: Date;
    },
  ): Promise<{
    manualReviewMinutes: number;
    echoGrowSeconds: number;
    savedMinutes: number;
  }> {
    const MANUAL_REVIEW_CONSTANTS = {
      BASE_MINUTES: 5,
      TRANSCRIPT_WPM: 150,
      CV_WPM: 200,
      MINUTES_PER_DISCREPANCY: 3,
      MINUTES_PER_WEAK_DIMENSION: 4,
      ECHOGROW_CAP_SECONDS: 180,
    };

    const countWords = (text: string) =>
      text.trim().split(/\s+/).filter(Boolean).length;

    const transcriptWords = countWords(params.transcript);
    const cvWords = countWords(params.resume);

    const manualReviewMinutes =
      MANUAL_REVIEW_CONSTANTS.BASE_MINUTES +
      transcriptWords / MANUAL_REVIEW_CONSTANTS.TRANSCRIPT_WPM +
      cvWords / MANUAL_REVIEW_CONSTANTS.CV_WPM +
      params.discrepanciesCount * MANUAL_REVIEW_CONSTANTS.MINUTES_PER_DISCREPANCY +
      params.weakDimensionsCount * MANUAL_REVIEW_CONSTANTS.MINUTES_PER_WEAK_DIMENSION;

    const completedAt = new Date();
    const rawSeconds = Math.max(0, (completedAt.getTime() - params.createdAt.getTime()) / 1000);
    const echoGrowSeconds = Math.min(rawSeconds, MANUAL_REVIEW_CONSTANTS.ECHOGROW_CAP_SECONDS);

    const savedSeconds = Math.max(0, manualReviewMinutes * 60 - echoGrowSeconds);
    const savedMinutes = savedSeconds < 60 ? 0 : savedSeconds / 60;

    await this.prisma.interviewSession.update({
      where: { id: interviewId },
      data: {
        manualReviewMinutes: Math.round(manualReviewMinutes * 10) / 10,
        echoGrowSeconds: Math.round(echoGrowSeconds),
        savedMinutes: Math.round(savedMinutes * 10) / 10,
        completedAt,
      },
    });

    this.logger.log(
      `[TimeSaved] Saved for ${interviewId}: manual=${manualReviewMinutes.toFixed(1)}m, ` +
        `echoGrow=${echoGrowSeconds.toFixed(0)}s, saved=${savedMinutes.toFixed(1)}m`,
    );

    return {
      manualReviewMinutes: Math.round(manualReviewMinutes * 10) / 10,
      echoGrowSeconds: Math.round(echoGrowSeconds),
      savedMinutes: Math.round(savedMinutes * 10) / 10,
    };
  }

  private mapDimensionType(name: string): any {
    switch (name) {
      case 'Technical Depth':
        return 'TECHNICAL_DEPTH';
      case 'Communication Clarity':
        return 'COMMUNICATION';
      case 'Domain Experience':
        return 'DOMAIN_EXPERIENCE';
      case 'Problem Solving':
        return 'PROBLEM_SOLVING';
      default:
        return 'TECHNICAL_DEPTH';
    }
  }
}