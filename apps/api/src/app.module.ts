import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './modules/prisma/prisma.module';
import { InterviewsModule } from './modules/interviews/interviews.module';
import { LlmModule } from './modules/llm/llm.module';
import { EvaluationModule } from './modules/evaluation/evaluation.module';
import { DiscrepancyModule } from './modules/discrepancy/discrepancy.module';
import { RoadmapModule } from './modules/roadmap/roadmap.module';
import { SpkModule } from './modules/spk/spk.module';
import { PipelineModule } from './modules/pipeline/pipeline.module';

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
    BullModule.registerQueue({ name: 'evaluation' }),
    PrismaModule,
    InterviewsModule,
    LlmModule,
    EvaluationModule,
    DiscrepancyModule,
    RoadmapModule,
    SpkModule,
    PipelineModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}