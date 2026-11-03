import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { EvaluationModule } from '../evaluation/evaluation.module';
import { DiscrepancyModule } from '../discrepancy/discrepancy.module';
import { PipelineProcessor } from './pipeline.processor';
import { EVALUATION_QUEUE_NAME } from '../evaluation/evaluation.constants';

@Module({
  imports: [
    EvaluationModule,
    DiscrepancyModule,
    BullModule.registerQueue({ name: EVALUATION_QUEUE_NAME }),
  ],
  providers: [PipelineProcessor],
})
export class PipelineModule {}