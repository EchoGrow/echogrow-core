import { Controller, Get, Param } from '@nestjs/common';
import { AppService } from './app.service';
import { TestService } from './queues/test/test.service';
import { LlmService } from './llm/llm.service';
import { z } from 'zod';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly testService: TestService,
    private readonly llmService: LlmService,
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
}