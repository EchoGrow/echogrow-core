import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';

@Processor('test-queue')
export class TestProcessor extends WorkerHost {
  private readonly logger = new Logger(TestProcessor.name);

  async process(job: Job<any>): Promise<any> {
    this.logger.log(`Processing job ${job.id} with data: ${JSON.stringify(job.data)}`);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    this.logger.log(`Job ${job.id} completed successfully`);
    return { success: true };
  }
}