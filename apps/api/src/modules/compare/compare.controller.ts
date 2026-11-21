import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CompareService } from './compare.service';

// Comparison triggers the LLM, so cap it in production but keep e2e tests fast.
const WRITE_LIMIT = process.env.NODE_ENV === 'test' ? 1000 : 10;

@Controller('interviews')
export class CompareController {
  constructor(private readonly compareService: CompareService) {}

  @Post('compare')
  @Throttle({ default: { limit: WRITE_LIMIT, ttl: 60000 } })
  async compare(@Body() body: any) {
    return this.compareService.compare(body);
  }

  @Get('compare/:id')
  async getComparison(@Param('id') id: string) {
    return this.compareService.findById(id);
  }
}