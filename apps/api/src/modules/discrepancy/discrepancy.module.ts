import { Module } from '@nestjs/common';
import { DiscrepancyService } from './discrepancy.service';
import { LlmModule } from '../llm/llm.module';

@Module({
  imports: [LlmModule],
  providers: [DiscrepancyService],
  exports: [DiscrepancyService],
})
export class DiscrepancyModule {}