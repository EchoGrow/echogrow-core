import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LlmService } from '../llm/llm.service';
import { EvaluationSchema, InterviewStatus } from '@echogrow/shared';
import { buildEvaluationPrompt } from './evaluation.prompts';

@Injectable()
export class EvaluationService {
  private readonly logger = new Logger(EvaluationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly llm: LlmService,
  ) {}

  /**
   * Updates the interview session's overall status AND the per-step boolean
   * flags that the frontend polls.
   *
   * When status transitions to PROCESSING, we also:
   *   - Reset `processingStartedAt = now()` (start of this attempt)
   *   - Increment `processingAttempts` (1 for initial, 2+ for retries)
   *
   * This ensures processing time = completedAt - processingStartedAt,
   * giving accurate duration with no outliers (even after retries).
   */
  async updateProgress(
    interviewId: string,
    status: InterviewStatus,
    flags: { isScored?: boolean; isVerified?: boolean; isPlanned?: boolean } = {},
  ): Promise<void> {
    const isProcessing = status === 'PROCESSING';

    await this.prisma.interviewSession.update({
      where: { id: interviewId },
      data: {
        status,
        ...flags,
        ...(isProcessing
          ? {
              processingStartedAt: new Date(),
              processingAttempts: { increment: 1 },
            }
          : {}),
        ...(status === 'COMPLETED' ? { completedAt: new Date() } : {}),
      },
    });
  }

  /**
   * Backwards-compatible wrapper. Kept for existing call sites.
   */
  async updateStatus(
    interviewId: string,
    status: InterviewStatus,
  ): Promise<void> {
    await this.updateProgress(interviewId, status);
  }

  async evaluate(transcript: string, resume: string): Promise<any> {
    const prompt = buildEvaluationPrompt(transcript, resume);
    return await this.llm.generate(prompt, EvaluationSchema);
  }

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
   * Saves the time-saved snapshot.
   *
   * uses `processingStartedAt` (not `createdAt`) to compute
   * the actual processing duration. This is critical: after a retry, `createdAt`
   * still points to the original upload (which may be hours ago), while
   * `processingStartedAt` points to the start of the successful attempt.
   */
  async saveTimeSaved(
    interviewId: string,
    params: {
      transcript: string;
      resume: string;
      discrepanciesCount: number;
      weakDimensionsCount: number;
      processingStartedAt: Date;
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
      // Cap only affects the SNAPSHOT (for display). The actual `echoGrowSeconds`
      // can exceed this when LLM is slow, but the snapshot reports a realistic
      // max so the "time saved" doesn't look absurd.
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
    // use processingStartedAt (start of the successful attempt)
    const rawSeconds = Math.max(
      0,
      (completedAt.getTime() - params.processingStartedAt.getTime()) / 1000,
    );
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