import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SpkService } from './spk.service';
import { SpkController } from './spk.controller';
import { SpkProcessor } from './spk.processor';
import { LlmModule } from '../llm/llm.module';
import { SPK_QUEUE_NAME } from './spk.constants';

@Module({
  imports: [
    LlmModule,
    BullModule.registerQueue({ name: SPK_QUEUE_NAME }),
  ],
  controllers: [SpkController],
  providers: [SpkService, SpkProcessor],
  exports: [SpkService],
})
export class SpkModule {}