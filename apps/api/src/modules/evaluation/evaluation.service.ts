import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, Job, JobsOptions } from 'bullmq';
import {
  EvaluationJobData,
  EvaluationJobResult,
} from '@echogrow/shared';
import { EVALUATION_JOB_NAME, EVALUATION_QUEUE_NAME } from './evaluation.constants';
import { EvaluationProcessor } from './evaluation.processor';

@Injectable()
export class EvaluationService {
  private readonly logger = new Logger(EvaluationService.name);

  constructor(
    @Optional()
    @InjectQueue(EVALUATION_QUEUE_NAME)
    private readonly evaluationQueue?: Queue,
    @Optional()
    private readonly processor?: EvaluationProcessor,
  ) {}

  /**
   * Adds an evaluation job to the BullMQ evaluation queue with automatic retries.
   */
  async queueEvaluation(
    data: EvaluationJobData,
    options?: JobsOptions,
  ): Promise<Job<EvaluationJobData>> {
    if (!this.evaluationQueue) {
      throw new Error(
        `Evaluation queue "${EVALUATION_QUEUE_NAME}" is not initialized or Redis connection is unavailable.`,
      );
    }

    const defaultOptions: JobsOptions = {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: false,
      removeOnFail: false,
      ...options,
    };

    const job = await this.evaluationQueue.add(EVALUATION_JOB_NAME, data, defaultOptions);
    this.logger.log(`Enqueued evaluation job ${job.id} for session ${data.interviewSessionId}`);
    return job;
  }

  /**
   * Runs evaluation directly using the processor (useful for offline tests or environments without Redis).
   */
  async evaluateDirectly(data: EvaluationJobData): Promise<EvaluationJobResult> {
    if (!this.processor) {
      throw new Error('EvaluationProcessor is not available in EvaluationService.');
    }

    const pseudoJob = {
      id: `direct_${Date.now()}`,
      data,
      attemptsMade: 0,
      opts: { attempts: 1 },
    } as unknown as Job<EvaluationJobData>;

    return await this.processor.process(pseudoJob);
  }
}

