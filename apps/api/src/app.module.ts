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
import { CompareModule } from './modules/compare/compare.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        // Reads (scorecard/analytics) are polled by the UI, so a global limit of
        // 10/min made every pipeline run fail with 429. Keep a generous global
        // safety net and apply strict limits only to expensive write endpoints.
        limit:
          process.env.NODE_ENV === 'test'
            ? 1000
            : Number(process.env.RATE_LIMIT_REQUESTS ?? 120),
        setHeaders: true,
      },
    ]),
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        // Production (Render/Redis External): use full URL with TLS
        const redisUrl = config.get<string>('REDIS_URL');
        if (redisUrl) {
          return {
            connection: {
              url: redisUrl,
              // family: 0 = let ioredis try IPv4 AND IPv6.
              // Required on Railway (IPv6 internal network) when connecting
              // to an external Redis (Render) over TLS.
              family: 0,
            },
          };
        }
        // Local development: host + port (no TLS)
        return {
          connection: {
            host: config.get<string>('REDIS_HOST', 'localhost'),
            port: config.get<number>('REDIS_PORT', 6379),
            family: 0,
          },
        };
      },
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
    CompareModule,
    AnalyticsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
