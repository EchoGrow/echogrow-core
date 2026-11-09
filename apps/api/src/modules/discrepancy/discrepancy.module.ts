import { Module } from '@nestjs/common';
import { DiscrepancyService } from './discrepancy.service';
import { DiscrepancyController } from './discrepancy.controller';
import { LlmModule } from '../llm/llm.module';

@Module({
  imports: [LlmModule],
  controllers: [DiscrepancyController],
  providers: [DiscrepancyService],
  exports: [DiscrepancyService],
})
export class DiscrepancyModule {}