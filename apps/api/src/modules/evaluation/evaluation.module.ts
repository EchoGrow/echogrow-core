import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { LlmModule } from '../../llm/llm.module';
import { EVALUATION_QUEUE_NAME } from './evaluation.constants';
import { EvaluationProcessor } from './evaluation.processor';
import { TranscriptParserService } from './transcript-parser.service';
import { EvaluationDbService } from './evaluation-db.service';
import { EvaluationService } from './evaluation.service';

@Module({
  imports: [
    LlmModule,
    BullModule.registerQueue({
      name: EVALUATION_QUEUE_NAME,
    }),
  ],
  providers: [
    TranscriptParserService,
    EvaluationDbService,
    EvaluationProcessor,
    EvaluationService,
  ],
  exports: [
    EvaluationService,
    EvaluationProcessor,
    TranscriptParserService,
    EvaluationDbService,
  ],
})
export class EvaluationModule {}

