import { Module } from '@nestjs/common';
import { InterviewsService } from './interviews.service';
import { InterviewsController } from './interviews.controller';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [BullModule.registerQueue({ name: 'evaluation-queue' })],
  controllers: [InterviewsController],
  providers: [InterviewsService],
})
export class InterviewsModule {}