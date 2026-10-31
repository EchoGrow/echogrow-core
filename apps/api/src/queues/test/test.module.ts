import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TestService } from './test.service';
import { TestProcessor } from './test.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'test-queue',
    }),
  ],
  providers: [TestService, TestProcessor],
  exports: [TestService],
})
export class TestModule {}