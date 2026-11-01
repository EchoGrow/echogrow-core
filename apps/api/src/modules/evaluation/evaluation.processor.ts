import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import {
  Evaluation,
  EvaluationJobData,
  EvaluationJobResult,
  EvaluationSchema,
} from '@echogrow/shared';
import { LlmService } from '../../llm/llm.service';
import { EVALUATION_QUEUE_NAME } from './evaluation.constants';
import { TranscriptParserService } from './transcript-parser.service';
import { EvaluationDbService } from './evaluation-db.service';
import { buildEvaluationPrompt } from './evaluation.prompts';

@Processor(EVALUATION_QUEUE_NAME)
export class EvaluationProcessor extends WorkerHost {
  private readonly logger = new Logger(EvaluationProcessor.name);

  constructor(
    private readonly llmService: LlmService,
    private readonly transcriptParser: TranscriptParserService,
    private readonly dbService: EvaluationDbService,
  ) {
    super();
  }

  /**
   * Main BullMQ worker process method for evaluation jobs.
   */
  async process(job: Job<EvaluationJobData>): Promise<EvaluationJobResult> {
    const rawData = job.data as any;
    const interviewSessionId =
      rawData.interviewSessionId || rawData.interviewId || rawData.id || String(job.id);
    const attempt = (job.attemptsMade ?? 0) + 1;
    const maxAttempts = job.opts?.attempts ?? 3;

    this.logger.log(
      `[Job ${job.id}] Started evaluation for session ${interviewSessionId} (Attempt ${attempt}/${maxAttempts})`,
    );

    try {
      // Step 1: Update session status to 'processing'
      await this.dbService.updateSessionStatus(interviewSessionId, 'processing');

      // Step 2: Retrieve transcript and CV
      let transcriptText = rawData.transcript;
      let cvText = rawData.cv;

      if (!transcriptText) {
        this.logger.log(
          `[Job ${job.id}] Transcript not in payload; fetching from database for session ${interviewSessionId}`,
        );
        const sessionRecord = await this.dbService.getInterviewSession(interviewSessionId);

        if (sessionRecord) {
          transcriptText = sessionRecord.transcript;
          cvText = cvText || sessionRecord.cv || sessionRecord.candidate?.resume;
        }
      }

      if (!transcriptText || !transcriptText.trim()) {
        throw new Error(
          `Transcript is missing or empty for interview session: ${interviewSessionId}`,
        );
      }

      // Step 3: Split transcript into speaker turns with timestamps
      const turns = this.transcriptParser.parse(transcriptText);
      if (turns.length === 0) {
        throw new Error(
          `Transcript parser produced 0 speaker turns for interview session: ${interviewSessionId}`,
        );
      }
      this.logger.log(
        `[Job ${job.id}] Successfully parsed ${turns.length} speaker turns from transcript`,
      );

      // Step 4: Format transcript and build rubric prompt
      const formattedTranscript = this.transcriptParser.formatForPrompt(turns);
      const prompt = buildEvaluationPrompt({
        formattedTranscript,
        cvText,
      });

      // Step 5: Call LLM with Zod schema validation and built-in retries
      this.logger.log(`[Job ${job.id}] Requesting evaluation from LlmService...`);
      const evaluation: Evaluation = await this.llmService.generate<Evaluation>(
        prompt,
        EvaluationSchema,
      );

      this.logger.log(
        `[Job ${job.id}] Received valid evaluation with ${evaluation.dimensions.length} dimensions. Overall confidence: ${evaluation.overallConfidence}`,
      );

      // Step 6: Save Scorecard and 4 Dimension records
      const { scorecardId } = await this.dbService.saveScorecardAndDimensions(
        interviewSessionId,
        evaluation,
      );

      // Step 7: Update InterviewSession status to 'scored'
      await this.dbService.updateSessionStatus(interviewSessionId, 'scored');
      this.logger.log(
        `[Job ${job.id}] Interview session ${interviewSessionId} successfully marked as "scored"`,
      );

      return {
        success: true,
        interviewSessionId,
        scorecardId,
        dimensionsCount: evaluation.dimensions.length,
        overallConfidence: evaluation.overallConfidence,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `[Job ${job.id}] Evaluation processing failed on attempt ${attempt}/${maxAttempts}: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );

      // If this was the last attempt, mark the session as failed in the database
      if (attempt >= maxAttempts) {
        this.logger.warn(
          `[Job ${job.id}] Max retry attempts reached. Updating session ${interviewSessionId} status -> "failed"`,
        );
        await this.dbService.updateSessionStatus(interviewSessionId, 'failed', errorMessage);
      }

      // Rethrow to allow BullMQ to handle job failure/retry backoff
      throw error;
    }
  }
}

