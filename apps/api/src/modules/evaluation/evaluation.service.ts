import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { EVALUATION_QUEUE_NAME, EVALUATION_JOB_NAME } from './evaluation.constants';

@Injectable()
export class EvaluationService {
  constructor(
    @InjectQueue(EVALUATION_QUEUE_NAME) private readonly evaluationQueue: Queue,
  ) {}

  async queueEvaluation(interviewId: string): Promise<string> {
    const job = await this.evaluationQueue.add(
      EVALUATION_JOB_NAME,
      { interviewId },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      },
    );
    return job.id || '';
  }
}