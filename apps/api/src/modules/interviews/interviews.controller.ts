import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { InterviewsService } from './interviews.service';

@Controller('interviews')
export class InterviewsController {
  constructor(private readonly interviewsService: InterviewsService) {}

  @Post('upload')
  async upload(@Body() body: any) {
    return this.interviewsService.upload(body);
  }

  @Get(':id/scorecard')
  async getScorecard(@Param('id') id: string) {
    return this.interviewsService.getScorecard(id);
  }

  @Post(':id/force-evaluate')
  async forceEvaluation(@Param('id') id: string) {
    return this.interviewsService.forceEvaluation(id);
  }

  @Post(':id/reject')
  async rejectInterview(@Param('id') id: string) {
    return this.interviewsService.rejectInterview(id);
  }

  @Get(':id/discrepancies')
  async getDiscrepancies(@Param('id') id: string) {
    return this.interviewsService.getDiscrepancies(id);
  }

  @Get(':id/roadmap')
  async getRoadmap(@Param('id') id: string) {
    return this.interviewsService.getRoadmap(id);
  }
}