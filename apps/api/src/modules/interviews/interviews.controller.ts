import { Controller, Post, Body } from '@nestjs/common';
import { InterviewsService } from './interviews.service';

@Controller('interviews')
export class InterviewsController {
  constructor(private readonly interviewsService: InterviewsService) {}

  @Post('upload')
  async upload(@Body() body: any) {
    // Pass The Body to Service So ZOD can check it
    return this.interviewsService.upload(body);
  }
}