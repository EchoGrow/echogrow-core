import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { InterviewsService } from './interviews.service';
import { InterviewsController } from './interviews.controller';
import { EvaluationModule } from '../evaluation/evaluation.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'evaluation' }),
    EvaluationModule,
  ],
  controllers: [InterviewsController],
  providers: [InterviewsService],
})
export class InterviewsModule {}