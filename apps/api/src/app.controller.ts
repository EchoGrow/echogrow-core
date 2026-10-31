import { Controller, Get, Param } from '@nestjs/common';
import { AppService } from './app.service';
import { TestService } from './queues/test/test.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly testService: TestService,
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
}