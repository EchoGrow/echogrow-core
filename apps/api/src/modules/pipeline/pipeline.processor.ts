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

      await this.evaluationService.updateStatus(interviewId, 'PROCESSING');

      const session = await this.prisma.interviewSession.findUnique({
        where: { id: interviewId },
        include: { candidate: true },
      });
      if (!session) throw new Error('Interview session not found');

      const turns = this.parser.parse(session.transcript);
      await this.prisma.interviewSession.update({
        where: { id: interviewId },
        data: { structuredTranscript: turns as any },
      });

      if (!force) {
        const confidence = this.parser.calculateConfidence(session.transcript);
        this.logger.log(`[Pipeline] Transcript confidence: ${confidence}`);

        if (confidence < 0.6) {
          this.logger.warn(
            `[Pipeline] Low confidence (${confidence}). Routing to NEEDS_REVIEW.`,
          );
          await this.evaluationService.updateStatus(interviewId, 'NEEDS_REVIEW');
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

      // 1. Scoring
      const evaluation = await this.evaluationService.evaluate(
        session.transcript,
        session.resume,
      );
      const { scorecardId } = await this.evaluationService.saveScorecard(
        interviewId,
        evaluation,
      );

      await this.prisma.interviewSession.update({
        where: { id: interviewId },
        data: { isScored: true },
      });
      this.logger.log(`[Pipeline] Scoring done for ${interviewId}`);

      // 2. Discrepancies
      const discrepancies = await this.discrepancyService.detect(
        session.resume,
        session.transcript,
      );
      await this.discrepancyService.saveDiscrepancies(
        scorecardId,
        discrepancies,
      );

      await this.prisma.interviewSession.update({
        where: { id: interviewId },
        data: { isVerified: true },
      });
      this.logger.log(`[Pipeline] Verification done for ${interviewId}`);

      // 3. Roadmap
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

      await this.prisma.interviewSession.update({
        where: { id: interviewId },
        data: { isPlanned: true },
      });
      this.logger.log(`[Pipeline] Planning done for ${interviewId}`);

      // 4. Final status
      await this.evaluationService.updateStatus(interviewId, 'COMPLETED');
      this.logger.log(`[Pipeline] Completed for session ${interviewId}`);

      // 5. Time Saved snapshot (computed once, persisted to DB)
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

      // 6. Build SPK profile (LLM metadata + verified skills)
      try {
        await this.spkService.buildSpkProfile(interviewId);
      } catch (cause: any) {
        this.logger.error(
          `[Pipeline] SPK profile build failed for ${interviewId}: ${cause.message}`,
          cause.stack,
        );
        // Non-fatal: pipeline is still COMPLETED, but SPK export will be unavailable.
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

      await this.evaluationService.updateStatus(interviewId, 'FAILED');

      throw error;
    }
  }
}