import { Controller, Get, Param } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { z } from 'zod';
import { AppService } from './app.service';
import { TestService } from './queues/test/test.service';
import { LlmService } from './llm/llm.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly testService: TestService,
    private readonly llmService: LlmService,
    @InjectQueue('evaluation-queue') private readonly evaluationQueue: Queue,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('test-queue')
  async testQueue() {
    return this.testService.addTestJob({ message: 'Hello from queue!' });
  }

  @Get('test-queue/:jobId')
  async getJobStatus(@Param('jobId') jobId: string) {
    const job = await this.testService.getJob(jobId);
    return {
      id: job?.id,
      status: await job?.getState(),
      data: job?.data,
      returnvalue: job?.returnvalue,
    };
  }

  @Get('test-llm')
  async testLlm() {
    const schema = z.object({
      greeting: z.string(),
      confidence: z.number().min(0).max(1),
    });
    return this.llmService.generate(
      'Say hello and give a confidence score between 0 and 1.',
      schema,
    );
  }

  @Get('queue-status')
  async getQueueStatus() {
    const waiting = await this.evaluationQueue.getWaitingCount();
    const active = await this.evaluationQueue.getActiveCount();
    const completed = await this.evaluationQueue.getCompletedCount();
    const failed = await this.evaluationQueue.getFailedCount();
    
    return { 
      queue: 'evaluation-queue',
      waiting, 
      active, 
      completed, 
      failed 
    };
  }
}