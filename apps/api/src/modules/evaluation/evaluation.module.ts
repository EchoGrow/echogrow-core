import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { LlmModule } from '../llm/llm.module'; // تم تصحيح المسار
import { EvaluationProcessor } from './evaluation.processor';
import { TranscriptParserService } from './transcript-parser.service';
import { EvaluationDbService } from './evaluation-db.service';
import { EVALUATION_QUEUE_NAME } from './evaluation.constants';

@Module({
  imports: [
    LlmModule,
    BullModule.registerQueue({ name: EVALUATION_QUEUE_NAME }),
  ],
  providers: [
    TranscriptParserService,
    EvaluationDbService,
    EvaluationProcessor,
  ],
})
export class EvaluationModule {}