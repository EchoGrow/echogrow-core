import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CompareService } from './compare.service';

@Controller('interviews')
export class CompareController {
  constructor(private readonly compareService: CompareService) {}

  @Post('compare')
  async compare(@Body() body: any) {
    return this.compareService.compare(body);
  }

  @Get('compare/:id')
  async getComparison(@Param('id') id: string) {
    return this.compareService.findById(id);
  }
}