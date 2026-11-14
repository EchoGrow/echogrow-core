import { Controller, Get, Query } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('summary')
  async getSummary(@Query() query: any) {
    return this.analyticsService.getSummary(query);
  }

  @Get('details')
  async getDetails(@Query() query: any) {
    return this.analyticsService.getDetails(query);
  }
}