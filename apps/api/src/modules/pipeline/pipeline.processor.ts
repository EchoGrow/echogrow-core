import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { EVALUATION_QUEUE_NAME } from '../evaluation/evaluation.constants';
import { EvaluationService } from '../evaluation/evaluation.service';
import { DiscrepancyService } from '../discrepancy/discrepancy.service';
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
    private readonly prisma: PrismaService,
    private readonly parser: TranscriptParserService,
  ) {
    super();
  }

  async process(job: Job<PipelineJobData>): Promise<any> {
    const { interviewId, force = false } = job.data;
    if (!interviewId) throw new Error('Missing interviewId in job data');

    this.logger.log(`[Pipeline] Started for session ${interviewId} (force: ${force})`);

    try {
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
          this.logger.warn(`[Pipeline] Low confidence (${confidence}). Routing to NEEDS_REVIEW.`);
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

      // 1. التقييم
      const evaluation = await this.evaluationService.evaluate(
        session.transcript,
        session.resume,
      );
      const { scorecardId } = await this.evaluationService.saveScorecard(
        interviewId,
        evaluation,
      );
      
      // تحديث حالة التقييم
      await this.prisma.interviewSession.update({
        where: { id: interviewId },
        data: { isScored: true },
      });
      this.logger.log(`[Pipeline] Scoring done for ${interviewId}`);

      // 2. كشف التناقضات
      const discrepancies = await this.discrepancyService.detect(
        session.resume,
        session.transcript,
      );
      await this.discrepancyService.saveDiscrepancies(
        scorecardId,
        discrepancies,
      );
      
      // تحديث حالة التحقق
      await this.prisma.interviewSession.update({
        where: { id: interviewId },
        data: { isVerified: true },
      });
      this.logger.log(`[Pipeline] Verification done for ${interviewId}`);

      // 3. (Sprint 03) توليد خطة النمو
      // await this.roadmapService.generate(scorecardId);
      
      // محاكاة خطة النمو (Dummy) - في Sprint 3 سنستبدلها بالكود الحقيقي
      await new Promise(resolve => setTimeout(resolve, 15000)); // وقت وهمي
      
      // تحديث حالة الخطة
      await this.prisma.interviewSession.update({
        where: { id: interviewId },
        data: { isPlanned: true },
      });
      this.logger.log(`[Pipeline] Planning done for ${interviewId}`);

      // 4. تحديث الحالة النهائية
      await this.evaluationService.updateStatus(interviewId, 'COMPLETED');
      this.logger.log(`[Pipeline] Completed for session ${interviewId}`);

      return {
        success: true,
        status: 'completed',
        scorecardId,
        discrepanciesCount: discrepancies.length,
      };
    } catch (error: any) {
      this.logger.error(`[Pipeline] Failed: ${error.message}`);

      if (job.attemptsMade >= (job.opts.attempts || 3) - 1) {
        await this.evaluationService.updateStatus(interviewId, 'FAILED');
      }
      throw error;
    }
  }
}