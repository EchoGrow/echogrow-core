import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { InterviewsService } from './interviews.service';

@Controller('interviews')
export class InterviewsController {
  constructor(private readonly interviewsService: InterviewsService) {}

  @Get(':id/scorecard')
  async getScorecard(@Param('id') id: string) {
    return this.interviewsService.getScorecard(id);
  }

  @Post('upload')
  async upload(@Body() body: any) {
    // Pass The Body to Service So ZOD can check it
    return this.interviewsService.upload(body);
  }
}