import { Module } from '@nestjs/common';
import { EvaluationService } from './evaluation.service';
import { TranscriptParserService } from './transcript-parser.service';
import { LlmModule } from '../llm/llm.module';

@Module({
  imports: [LlmModule],
  providers: [EvaluationService, TranscriptParserService],
  exports: [EvaluationService, TranscriptParserService],
})
export class EvaluationModule {}