import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { EvaluationSchema } from '@echogrow/shared';
import { LlmService } from '../llm/llm.service';
import { TranscriptParserService } from './transcript-parser.service';
import { EvaluationDbService } from './evaluation-db.service';
import { buildEvaluationPrompt } from './evaluation.prompts';
import { EVALUATION_QUEUE_NAME } from './evaluation.constants';

@Processor(EVALUATION_QUEUE_NAME)
export class EvaluationProcessor extends WorkerHost {
  private readonly logger = new Logger(EvaluationProcessor.name);

  constructor(
    private readonly llmService: LlmService,
    private readonly parser: TranscriptParserService,
    private readonly db: EvaluationDbService,
  ) {
    super();
  }

  async process(job: Job<{ interviewId: string }>): Promise<any> {
    const interviewSessionId = job.data.interviewId;
    if (!interviewSessionId) throw new Error('Missing interviewId in job data');

    this.logger.log(`Started evaluation for session ${interviewSessionId}`);

    try {
      await this.db.updateSessionStatus(interviewSessionId, 'processing');
      const session = await this.db.getInterviewSession(interviewSessionId);
      if (!session) throw new Error('Interview session not found');

      const turns = this.parser.parse(session.transcript);
      const formattedTranscript = this.parser.formatForPrompt(turns);
      
      const prompt = buildEvaluationPrompt(formattedTranscript, session.resume); 
      const evaluation = await this.llmService.generate(prompt, EvaluationSchema);

      await this.db.saveScorecardAndDimensions(interviewSessionId, evaluation);
      await this.db.updateSessionStatus(interviewSessionId, 'scored');
      
      this.logger.log(`Successfully evaluated session ${interviewSessionId}`);
      return { success: true };
    } catch (error: any) {
      this.logger.error(`Evaluation failed: ${error.message}`);
      if (job.attemptsMade >= (job.opts.attempts || 3) - 1) {
        await this.db.updateSessionStatus(interviewSessionId, 'failed', error.message);
      }
      throw error;
    }
  }
}