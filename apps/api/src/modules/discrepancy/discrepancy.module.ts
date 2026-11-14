import { Module } from '@nestjs/common';
import { DiscrepancyService } from './discrepancy.service';
import { DiscrepancyController } from './discrepancy.controller';
import { LlmModule } from '../llm/llm.module';
import { SpkModule } from '../spk/spk.module';

@Module({
  imports: [LlmModule, SpkModule],
  controllers: [DiscrepancyController],
  providers: [DiscrepancyService],
  exports: [DiscrepancyService],
})
export class DiscrepancyModule {}