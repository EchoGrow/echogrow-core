import { Module } from '@nestjs/common';
import { SpkService } from './spk.service';
import { SpkController } from './spk.controller';
import { LlmModule } from '../llm/llm.module';

@Module({
  imports: [LlmModule],
  controllers: [SpkController],
  providers: [SpkService],
  exports: [SpkService],
})
export class SpkModule {}