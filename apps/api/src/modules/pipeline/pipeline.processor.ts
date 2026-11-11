import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { EVALUATION_QUEUE_NAME } from '../evaluation/evaluation.constants';
import { EvaluationService } from '../evaluation/evaluation.service';
import { DiscrepancyService } from '../discrepancy/discrepancy.service';
import { RoadmapService } from '../roadmap/roadmap.service';
import { SpkService } from '../spk/spk.service';
import { PrismaService } from '../prisma/prisma.service';
import { TranscriptParserService } from '../evaluation/transcript-parser.service';

interface PipelineJobData {
  interviewId: string;
  force?: boolean;
}

@Processor(EVALUATION_QUEUE_NAME)
export class PipelineProcessor extends WorkerHost {
  private readonly logger = new Logger(PipelineProcessor.name);

  constructor(
    private readonly evaluationService: EvaluationService,
    private readonly discrepancyService: DiscrepancyService,
    private readonly roadmapService: RoadmapService,
    private readonly spkService: SpkService,
    private readonly prisma: PrismaService,
    private readonly parser: TranscriptParserService,
  ) {
    super();
  }

  async process(job: Job<PipelineJobData>): Promise<any> {
    const { interviewId, force = false } = job.data;
    if (!interviewId) throw new Error('Missing interviewId in job data');

    this.logger.log(
      `[Pipeline] Started for session ${interviewId} (force: ${force})`,
    );

    try {
      const preCheck = await this.prisma.interviewSession.findUnique({
        where: { id: interviewId },
        select: { status: true },
      });

      if (!preCheck) throw new Error('Interview session not found');

      if (preCheck.status === 'COMPLETED' && !force) {
        this.logger.log(
          `[Pipeline] Session ${interviewId} already COMPLETED. Skipping (use force=true to rerun).`,
        );
        return { success: true, status: 'completed', skipped: true };
      }

      // ============================================================
      // STEP 0: mark as PROCESSING (frontend will poll for isScored/isVerified/isPlanned)
      // ============================================================
      await this.evaluationService.updateProgress(interviewId, 'PROCESSING', {
        isScored: false,
        isVerified: false,
        isPlanned: false,
      });

      const session = await this.prisma.interviewSession.findUnique({
        where: { id: interviewId },
        include: { candidate: true },
      });
      if (!session) throw new Error('Interview session not found');

      // Parse transcript.
      const turns = this.parser.parse(session.transcript);
      await this.prisma.interviewSession.update({
        where: { id: interviewId },
        data: { structuredTranscript: turns as any },
      });

      // Confidence check.
      if (!force) {
        const confidence = this.parser.calculateConfidence(session.transcript);
        this.logger.log(`[Pipeline] Transcript confidence: ${confidence}`);

        if (confidence < 0.6) {
          this.logger.warn(
            `[Pipeline] Low confidence (${confidence}). Routing to NEEDS_REVIEW.`,
          );
          await this.evaluationService.updateProgress(interviewId, 'NEEDS_REVIEW', {
            isScored: false,
            isVerified: false,
            isPlanned: false,
          });
          return {
            success: true,
            status: 'needs_review',
            confidence,
            reason: 'Low-confidence transcript; skipped automatic scoring.',
          };
        }
      } else {
        this.logger.log(`[Pipeline] Force flag set. Skipping confidence check.`);
      }

      // ============================================================
      // STEP 1: Scoring → mark isScored = true IMMEDIATELY after
      // ============================================================
      const evaluation = await this.evaluationService.evaluate(
        session.transcript,
        session.resume,
      );
      const { scorecardId } = await this.evaluationService.saveScorecard(
        interviewId,
        evaluation,
      );

      // Update status AND isScored in one atomic operation.
      // The frontend's "Scoring" step will flip to ✅ immediately.
      await this.evaluationService.updateProgress(interviewId, 'SCORED', {
        isScored: true,
      });
      this.logger.log(`[Pipeline] Scoring done for ${interviewId}`);

      // ============================================================
      // STEP 2: Discrepancies → mark isVerified = true IMMEDIATELY after
      // ============================================================
      const discrepancies = await this.discrepancyService.detect(
        session.resume,
        session.transcript,
      );
      await this.discrepancyService.saveDiscrepancies(
        scorecardId,
        discrepancies,
      );

      await this.evaluationService.updateProgress(interviewId, 'SCORED', {
        isScored: true,
        isVerified: true,
      });
      this.logger.log(`[Pipeline] Verification done for ${interviewId}`);

      // ============================================================
      // STEP 3: Roadmap → mark isPlanned = true IMMEDIATELY after
      // ============================================================
      const roadmapResult = await this.roadmapService.generateAndSave(scorecardId);

      if (roadmapResult) {
        this.logger.log(
          `[Pipeline] Roadmap generated with ${roadmapResult.gaps.length} gaps and ${roadmapResult.roadmap.length} weeks.`,
        );
      } else {
        this.logger.log(
          `[Pipeline] No weak dimensions found. Skipping roadmap generation.`,
        );
      }

      await this.evaluationService.updateProgress(interviewId, 'SCORED', {
        isScored: true,
        isVerified: true,
        isPlanned: true,
      });
      this.logger.log(`[Pipeline] Planning done for ${interviewId}`);

      // ============================================================
      // STEP 4: mark COMPLETED (now the frontend shows the full report)
      // ============================================================
      await this.evaluationService.updateProgress(interviewId, 'COMPLETED', {
        isScored: true,
        isVerified: true,
        isPlanned: true,
      });
      this.logger.log(`[Pipeline] Completed for session ${interviewId}`);

      // ============================================================
      // STEP 5: save time-saved snapshot
      // ============================================================
      try {
        const scorecard = await this.prisma.scorecard.findUnique({
          where: { interviewId },
          include: { dimensions: true, discrepancies: true },
        });

        if (scorecard) {
          const weakDimensionsCount = scorecard.dimensions.filter((d) => d.score <= 2).length;
          await this.evaluationService.saveTimeSaved(interviewId, {
            transcript: session.transcript,
            resume: session.resume,
            discrepanciesCount: scorecard.discrepancies.length,
            weakDimensionsCount,
            createdAt: session.createdAt,
          });
        }
      } catch (cause: any) {
        this.logger.warn(
          `[Pipeline] Failed to save time-saved snapshot for ${interviewId}: ${cause.message}`,
        );
      }

      // ============================================================
      // STEP 6: build SPK profile (background, non-fatal)
      // ============================================================
      try {
        await this.spkService.buildSpkProfile(interviewId);
      } catch (cause: any) {
        this.logger.error(
          `[Pipeline] SPK profile build failed for ${interviewId}: ${cause.message}`,
          cause.stack,
        );
      }

      return {
        success: true,
        status: 'completed',
        scorecardId,
        discrepanciesCount: discrepancies.length,
        roadmapWeeks: roadmapResult?.roadmap.length ?? 0,
      };
    } catch (error: any) {
      this.logger.error(
        `[Pipeline] Failed for session ${interviewId}: ${error.message}`,
        error.stack,
      );

      await this.evaluationService.updateProgress(interviewId, 'FAILED', {
        isScored: false,
        isVerified: false,
        isPlanned: false,
      });

      throw error;
    }
  }
}