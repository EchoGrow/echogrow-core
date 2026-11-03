import { Controller, Patch, Param, Body, NotFoundException, BadRequestException } from '@nestjs/common';
import { DiscrepancyService } from './discrepancy.service';
import { DiscrepancyStatusUpdateSchema } from '@echogrow/shared';

@Controller('discrepancies')
export class DiscrepancyController {
  constructor(private readonly discrepancyService: DiscrepancyService) {}

  @Patch(':id')
  async updateStatus(@Param('id') id: string, @Body() body: any) {
    // 1. التحقق من صحة البيانات باستخدام Zod
    const parsed = DiscrepancyStatusUpdateSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues.map((e) => e.message).join(', '));
    }

    // 2. تحديث الحالة في قاعدة البيانات
    const updated = await this.discrepancyService.updateStatus(
      id,
      parsed.data.status,
    );

    if (!updated) {
      throw new NotFoundException('Discrepancy not found');
    }

    return updated;
  }
}