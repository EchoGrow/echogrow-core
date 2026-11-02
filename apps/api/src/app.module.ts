import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './modules/prisma/prisma.module';
import { InterviewsModule } from './modules/interviews/interviews.module';
import { LlmModule } from './modules/llm/llm.module';
import { EvaluationModule } from './modules/evaluation/evaluation.module';
import { EVALUATION_QUEUE_NAME } from './modules/evaluation/evaluation.constants';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
        },
      }),
    }),
    BullModule.registerQueue({ name: EVALUATION_QUEUE_NAME }),
    PrismaModule,
    InterviewsModule,
    LlmModule,
    EvaluationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}