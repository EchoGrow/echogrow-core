import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/modules/prisma/prisma.service';
import {
  createTestApp,
  closeTestApp,
  seedSession,
  seedScorecard,
} from './setup';

describe('E2E: Compare feature', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const api = () => request(app.getHttpServer());

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  afterAll(async () => {
    await closeTestApp(app, prisma);
  });

  async function seedCompletedCandidate(name: string, email: string) {
    const s = await seedSession(prisma, {
      status: 'COMPLETED',
      name,
      email,
      isScored: true,
      isVerified: true,
      isPlanned: true,
    });
    await seedScorecard(prisma, s.id, {
      scores: [4, 4, 3, 4],
      discrepancies: 1,
      gaps: ['Docker'],
    });
    return s;
  }

  describe('GET /interviews', () => {
    it('returns completed interviews with summary stats', async () => {
      await seedCompletedCandidate('Compare A', 'cmp.a@example.com');
      await seedCompletedCandidate('Compare B', 'cmp.b@example.com');

      const { body } = await api().get('/interviews').expect(200);
      expect(body.total).toBeGreaterThanOrEqual(2);
      expect(Array.isArray(body.interviews)).toBe(true);

      const first = body.interviews[0];
      expect(first).toHaveProperty('id');
      expect(first).toHaveProperty('candidateName');
      expect(first).toHaveProperty('overallScore');
      expect(first).toHaveProperty('pendingDiscrepancies');
      expect(first).toHaveProperty('skillGaps');
    });
  });

  describe('POST /interviews/compare', () => {
    it('rejects fewer than 2 candidates', async () => {
      const s = await seedCompletedCandidate('One', 'one@example.com');
      await api()
        .post('/interviews/compare')
        .send({ interviewIds: [s.id] })
        .expect(400);
    });

    it('rejects unknown interviews', async () => {
      await api()
        .post('/interviews/compare')
        .send({ interviewIds: ['does-not-exist-1', 'does-not-exist-2'] })
        .expect(400);
    });

    it('rejects non-completed interviews', async () => {
      const queued = await seedSession(prisma, {
        status: 'QUEUED',
        name: 'Queued',
        email: 'queued@example.com',
      });
      const done = await seedCompletedCandidate('Done', 'done@example.com');
      await api()
        .post('/interviews/compare')
        .send({ interviewIds: [queued.id, done.id] })
        .expect(400);
    });

    it('rejects duplicate IDs', async () => {
      const s = await seedCompletedCandidate('Dup', 'dup@example.com');
      await api()
        .post('/interviews/compare')
        .send({ interviewIds: [s.id, s.id] })
        .expect(400);
    });

    it(
      'compares 2 candidates without targetRole (calls LLM)',
      async () => {
        const a = await seedCompletedCandidate('Ahmed', 'ahmed.cmp@example.com');
        const b = await seedCompletedCandidate('Layla', 'layla.cmp@example.com');

        const { body } = await api()
          .post('/interviews/compare')
          .send({ interviewIds: [a.id, b.id] })
          .expect(201);

        expect(body.id).toBeTruthy();
        expect(body.result).toBeDefined();
        expect(body.result.summary).toBeTruthy();
        expect(body.result.ranking).toHaveLength(2);
        expect(body.result.perDimensionWinners).toHaveLength(4);
        expect(body.result.confidence).toBeGreaterThan(0);
        expect(body.result.targetRole).toBeNull();
      },
      120_000,
    );

    it(
      'compares candidates with a targetRole (includes fitScore)',
      async () => {
        const a = await seedCompletedCandidate('Ahmed2', 'ahmed2.cmp@example.com');
        const b = await seedCompletedCandidate('Layla2', 'layla2.cmp@example.com');

        const { body } = await api()
          .post('/interviews/compare')
          .send({
            interviewIds: [a.id, b.id],
            targetRole: 'Senior Backend Developer',
          })
          .expect(201);

        expect(body.result.targetRole).toBe('Senior Backend Developer');
        for (const r of body.result.ranking) {
          expect(r.fitScore).toBeGreaterThanOrEqual(0);
          expect(r.fitScore).toBeLessThanOrEqual(100);
        }
      },
      120_000,
    );
  });

  describe('GET /interviews/compare/:id', () => {
    it('404 for unknown comparison', async () => {
      await api().get('/interviews/compare/does-not-exist').expect(404);
    });

    it(
      'returns the saved comparison',
      async () => {
        const a = await seedCompletedCandidate('Persist A', 'persist.a@example.com');
        const b = await seedCompletedCandidate('Persist B', 'persist.b@example.com');

        const { body: created } = await api()
          .post('/interviews/compare')
          .send({ interviewIds: [a.id, b.id] })
          .expect(201);

        const { body } = await api()
          .get(`/interviews/compare/${created.id}`)
          .expect(200);

        expect(body.id).toBe(created.id);
        expect(body.status).toBe('COMPLETED');
        expect(body.interviews).toHaveLength(2);
        expect(body.rankings.length).toBeGreaterThanOrEqual(2);
        expect(body.completedAt).toBeTruthy();
      },
      120_000,
    );
  });
});