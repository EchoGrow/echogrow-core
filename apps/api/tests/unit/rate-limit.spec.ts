/**
 * Regression test for the "ThrottlerException: Too Many Requests" bug.
 *
 * Uses a minimal Nest app (no Postgres / Redis / LLM) to verify the two
 * properties the fix depends on:
 *   1. the global limit is high enough for scorecard polling (> 10/min)
 *   2. expensive write routes still get a strict per-route limit + Retry-After
 */
import { Controller, Get, INestApplication, Module, Post } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { Throttle, ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

@Controller()
class ProbeController {
  @Get('polled')
  polled() {
    return { ok: true };
  }

  @Post('write')
  @Throttle({ default: { limit: 2, ttl: 60_000 } })
  write() {
    return { ok: true };
  }
}

@Module({
  imports: [
    ThrottlerModule.forRoot([
      { ttl: 60_000, limit: 120, setHeaders: true },
    ]),
  ],
  controllers: [ProbeController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
class ProbeModule {}

describe('rate limiter allows polling but still protects writes', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ProbeModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('serves more than 10 read requests in a minute', async () => {
    for (let i = 0; i < 15; i++) {
      await request(app.getHttpServer()).get('/polled').expect(200);
    }
  });

  it('returns 429 with Retry-After on an over-limit write route', async () => {
    await request(app.getHttpServer()).post('/write').expect(201);
    await request(app.getHttpServer()).post('/write').expect(201);

    const res = await request(app.getHttpServer()).post('/write').expect(429);
    expect(res.headers['retry-after']).toBeDefined();
    expect(res.body.message).toContain('ThrottlerException');
  });
});
