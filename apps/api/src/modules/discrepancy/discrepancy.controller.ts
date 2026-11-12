import { Controller, Patch, Param, Body } from '@nestjs/common';
import { DiscrepancyService } from './discrepancy.service';
import { DiscrepancyStatusUpdate } from '@echogrow/shared';

@Controller('discrepancies')
export class DiscrepancyController {
  constructor(private readonly discrepancyService: DiscrepancyService) {}

  @Patch(':id')
  async updateStatus(@Param('id') id: string, @Body() body: DiscrepancyStatusUpdate) {
    return await this.discrepancyService.updateStatus(id, body);
  }
}