import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class TestService {
  constructor(@InjectQueue('test-queue') private testQueue: Queue) {}

  async addTestJob(data: any) {
    const job = await this.testQueue.add('test-job', data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
    });
    return { jobId: job.id, status: 'queued' };
  }

  async getJob(jobId: string) {
    return this.testQueue.getJob(jobId);
  }
}