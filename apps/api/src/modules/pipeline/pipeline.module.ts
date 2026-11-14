import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { EvaluationModule } from '../evaluation/evaluation.module';
import { DiscrepancyModule } from '../discrepancy/discrepancy.module';
import { RoadmapModule } from '../roadmap/roadmap.module';
import { SpkModule } from '../spk/spk.module';
import { PipelineProcessor } from './pipeline.processor';
import { EVALUATION_QUEUE_NAME } from '../evaluation/evaluation.constants';
import { SPK_QUEUE_NAME } from '../spk/spk.constants';

@Module({
  imports: [
    EvaluationModule,
    DiscrepancyModule,
    RoadmapModule,
    SpkModule,
    BullModule.registerQueue({ name: EVALUATION_QUEUE_NAME }),
    BullModule.registerQueue({ name: SPK_QUEUE_NAME }),
  ],
  providers: [PipelineProcessor],
})
export class PipelineModule {}