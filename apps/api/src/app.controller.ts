import { Controller, Get } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { z } from 'zod';
import { AppService } from './app.service';
import { LlmService } from './modules/llm/llm.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly llmService: LlmService,
    @InjectQueue('evaluation') private readonly evaluationQueue: Queue,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('test-llm')
  async testLlm() {
    const schema = z.object({ greeting: z.string(), confidence: z.number() });
    return this.llmService.generate('Say hello and give a confidence score.', schema);
  }

  @Get('queue-status')
  async getQueueStatus() {
    const waiting = await this.evaluationQueue.getWaitingCount();
    const active = await this.evaluationQueue.getActiveCount();
    const completed = await this.evaluationQueue.getCompletedCount();
    const failed = await this.evaluationQueue.getFailedCount();
    return { waiting, active, completed, failed };
  }
}