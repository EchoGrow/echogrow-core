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

describe('E2E: Analytics (summary + details)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const api = () => request(app.getHttpServer());

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  afterAll(async () => {
    await closeTestApp(app, prisma);
  });

  async function seedCompleted(
    name: string,
    email: string,
    opts: {
      scores?: number[];
      discrepancies?: number;
      gaps?: string[];
      processingAttempts?: number;
      processingStartedAt?: Date;
      completedAt?: Date;
    } = {},
  ) {
    const s = await seedSession(prisma, {
      status: 'COMPLETED',
      name,
      email,
      isScored: true,
      isVerified: true,
      isPlanned: true,
      processingAttempts: opts.processingAttempts ?? 1,
    });
    await seedScorecard(prisma, s.id, {
      scores: opts.scores ?? [4, 4, 3, 4],
      discrepancies: opts.discrepancies ?? 1,
      gaps: opts.gaps ?? ['Docker'],
      processingStartedAt: opts.processingStartedAt,
      completedAt: opts.completedAt,
      processingAttempts: opts.processingAttempts,
    });
    return s;
  }

  async function seedNeedsReview(name: string, email: string) {
    return seedSession(prisma, {
      status: 'NEEDS_REVIEW',
      name,
      email,
      structuredTranscript: [
        { speaker: 'Interviewer', text: 'Hi', timestamp: '00:00:00' },
      ],
    });
  }

  // ============================================================
  // GET /analytics/summary
  // ============================================================
  describe('GET /analytics/summary', () => {
    it('returns the full analytics summary with default range (30d)', async () => {
      await seedCompleted('Analytics A', 'an.a@example.com');
      await seedCompleted('Analytics B', 'an.b@example.com', {
        processingAttempts: 3,
      });

      const { body } = await api().get('/analytics/summary').expect(200);

      expect(body.range).toBe('30d');
      expect(body.generatedAt).toBeTruthy();

      // KPIs
      expect(body.kpis).toBeDefined();
      expect(body.kpis.totalInterviews).toBeGreaterThanOrEqual(2);
      expect(body.kpis.completedInterviews).toBeGreaterThanOrEqual(2);
      expect(body.kpis.completionRate).toBeGreaterThanOrEqual(0);
      expect(body.kpis.avgOverallScore).toBeGreaterThan(0);

      // ✅ NEW: retry tracking KPIs
      expect(body.kpis.retriedInterviews).toBeGreaterThanOrEqual(1);
      expect(body.kpis.avgProcessingAttempts).toBeGreaterThanOrEqual(1);

      // Charts
      expect(Array.isArray(body.charts.topMissingSkills)).toBe(true);
      expect(body.charts.topMissingSkills.length).toBeGreaterThan(0);
      expect(body.charts.topMissingSkills[0]).toHaveProperty('skill');
      expect(body.charts.topMissingSkills[0]).toHaveProperty('count');

      expect(Array.isArray(body.charts.interviewsPerDay)).toBe(true);
      expect(body.charts.interviewsPerDay.length).toBe(30);

      expect(body.charts.dimensionAverages).toBeDefined();
      expect(body.charts.dimensionAverages.technicalDepth).toBeGreaterThan(0);

      expect(Array.isArray(body.charts.topDiscrepancyClaims)).toBe(true);

      // Tables
      expect(Array.isArray(body.tables.recentInterviews)).toBe(true);
      expect(body.tables.recentInterviews.length).toBeGreaterThan(0);
      expect(body.tables.recentInterviews[0]).toHaveProperty('candidateName');
      expect(body.tables.recentInterviews[0]).toHaveProperty('status');
      // ✅ NEW: processingAttempts is included
      expect(body.tables.recentInterviews[0]).toHaveProperty(
        'processingAttempts',
      );
    });

    it.each(['7d', '30d', '90d', 'all'])(
      'accepts the "%s" range',
      async (range) => {
        const { body } = await api()
          .get(`/analytics/summary?range=${range}`)
          .expect(200);
        expect(body.range).toBe(range);
      },
    );

    it('rejects an invalid range', async () => {
      await api().get('/analytics/summary?range=banana').expect(400);
    });
  });

  // ============================================================
  // GET /analytics/details
  // ============================================================
  describe('GET /analytics/details — validation', () => {
    it('rejects an unknown type', async () => {
      await api().get('/analytics/details?type=banana').expect(400);
    });

    it('rejects an invalid range', async () => {
      await api()
        .get('/analytics/details?type=interviews&range=banana')
        .expect(400);
    });
  });

  // ============================================================
  // GET /analytics/details?type=interviews
  // ============================================================
  describe('GET /analytics/details?type=interviews', () => {
    it('returns interviews with processingAttempts', async () => {
      await seedCompleted('Detail A', 'detail.a@example.com', {
        processingAttempts: 1,
      });
      await seedCompleted('Detail B', 'detail.b@example.com', {
        processingAttempts: 3,
      });

      const { body } = await api()
        .get('/analytics/details?type=interviews&range=30d')
        .expect(200);

      expect(body.items).toBeDefined();
      expect(body.items.length).toBeGreaterThanOrEqual(2);
      expect(body.total).toBeGreaterThanOrEqual(2);

      for (const item of body.items) {
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('candidateName');
        expect(item).toHaveProperty('candidateEmail');
        expect(item).toHaveProperty('status');
        expect(item).toHaveProperty('overallScore');
        expect(item).toHaveProperty('pendingDiscrepancies');
        expect(item).toHaveProperty('totalDiscrepancies');
        expect(item).toHaveProperty('skillGaps');
        expect(item).toHaveProperty('createdAt');
        expect(item).toHaveProperty('completedAt');
        // ✅ NEW: processingAttempts is exposed
        expect(item).toHaveProperty('processingAttempts');
        expect(typeof item.processingAttempts).toBe('number');
      }

      const withRetry = body.items.find(
        (i: any) => i.processingAttempts === 3,
      );
      expect(withRetry).toBeDefined();
    });

    it('supports status filter', async () => {
      await seedCompleted('Filtered A', 'filtered.a@example.com');

      const { body } = await api()
        .get('/analytics/details?type=interviews&range=30d&status=COMPLETED')
        .expect(200);

      expect(body.items.every((i: any) => i.status === 'COMPLETED')).toBe(
        true,
      );
    });
  });

  // ============================================================
  // GET /analytics/details?type=completion-breakdown
  // ============================================================
  describe('GET /analytics/details?type=completion-breakdown', () => {
    it('returns status breakdown with percentages', async () => {
      await seedCompleted('Breakdown A', 'breakdown.a@example.com');
      await seedNeedsReview('Breakdown B', 'breakdown.b@example.com');

      const { body } = await api()
        .get('/analytics/details?type=completion-breakdown&range=30d')
        .expect(200);

      expect(body.total).toBeGreaterThanOrEqual(1);
      expect(body.formula).toBeTruthy();
      expect(Array.isArray(body.items)).toBe(true);

      const statuses = body.items.map((i: any) => i.status);
      expect(statuses).toContain('COMPLETED');

      for (const item of body.items) {
        expect(typeof item.count).toBe('number');
        expect(typeof item.percentage).toBe('number');
        expect(item.percentage).toBeGreaterThanOrEqual(0);
        expect(item.percentage).toBeLessThanOrEqual(100);
      }
    });
  });

  // ============================================================
  // GET /analytics/details?type=processing-times
  // ============================================================
  describe('GET /analytics/details?type=processing-times', () => {
    it('returns processing times with accurate (non-capped) durations', async () => {
      const startedAt = new Date(Date.now() - 2_000);
      const completedAt = new Date();
      await seedCompleted('Processing A', 'processing.a@example.com', {
        processingStartedAt: startedAt,
        completedAt,
      });

      const { body } = await api()
        .get('/analytics/details?type=processing-times&range=30d')
        .expect(200);

      expect(Array.isArray(body.items)).toBe(true);
      expect(body.items.length).toBeGreaterThanOrEqual(1);
      expect(typeof body.avgProcessingSeconds).toBe('number');
      expect(typeof body.avgManualSeconds).toBe('number');
      expect(typeof body.totalSavedSeconds).toBe('number');

      for (const item of body.items) {
        expect(item).toHaveProperty('interviewId');
        expect(item).toHaveProperty('candidateName');
        expect(item).toHaveProperty('processingSeconds');
        expect(item).toHaveProperty('manualReviewSeconds');
        expect(item).toHaveProperty('savedSeconds');
        expect(item).toHaveProperty('savingsPercent');
        // ✅ NEW: processingAttempts is exposed
        expect(item).toHaveProperty('processingAttempts');
        expect(typeof item.processingAttempts).toBe('number');
      }

      const item = body.items.find(
        (i: any) => i.candidateName === 'Processing A',
      );
      expect(item).toBeDefined();
      expect(item.processingSeconds).toBeGreaterThanOrEqual(1);
      expect(item.processingSeconds).toBeLessThanOrEqual(5);
      expect(item.savedSeconds).toBeGreaterThan(0);
    });

    it('does not cap long processing times at 180s anymore', async () => {
      const startedAt = new Date(Date.now() - 300_000);
      const completedAt = new Date();
      await seedCompleted('Processing Long', 'processing.long@example.com', {
        processingStartedAt: startedAt,
        completedAt,
      });

      const { body } = await api()
        .get('/analytics/details?type=processing-times&range=30d')
        .expect(200);

      const item = body.items.find(
        (i: any) => i.candidateName === 'Processing Long',
      );
      expect(item).toBeDefined();
      // ✅ Should be ~300s, NOT capped at 180s
      expect(item.processingSeconds).toBeGreaterThanOrEqual(295);
      expect(item.processingSeconds).toBeLessThanOrEqual(305);
    });
  });

  // ============================================================
  // GET /analytics/details?type=discrepancies
  // ============================================================
  describe('GET /analytics/details?type=discrepancies', () => {
    it('returns discrepancies per candidate with severity breakdown', async () => {
      await seedCompleted('Disc A', 'disc.a@example.com', {
        discrepancies: 2,
      });
      await seedCompleted('Disc B', 'disc.b@example.com', {
        discrepancies: 0,
      });

      const { body } = await api()
        .get('/analytics/details?type=discrepancies&range=30d')
        .expect(200);

      expect(Array.isArray(body.items)).toBe(true);
      expect(typeof body.totalDiscrepancies).toBe('number');
      expect(typeof body.totalPending).toBe('number');
      expect(typeof body.totalConfirmed).toBe('number');
      expect(typeof body.totalDismissed).toBe('number');

      const withDisc = body.items.find(
        (i: any) => i.candidateName === 'Disc A',
      );
      expect(withDisc).toBeDefined();
      expect(withDisc.total).toBe(2);
      expect(withDisc.pending).toBe(2);
    });
  });

  // ============================================================
  // GET /analytics/details?type=scores
  // ============================================================
  describe('GET /analytics/details?type=scores', () => {
    it('returns per-candidate scores with distribution', async () => {
      await seedCompleted('Score A', 'score.a@example.com', {
        scores: [4, 4, 4, 4],
      });
      await seedCompleted('Score B', 'score.b@example.com', {
        scores: [2, 3, 3, 2],
      });

      const { body } = await api()
        .get('/analytics/details?type=scores&range=30d')
        .expect(200);

      expect(Array.isArray(body.items)).toBe(true);
      expect(Array.isArray(body.distribution)).toBe(true);
      expect(typeof body.avgScore).toBe('number');

      expect(body.distribution.length).toBeGreaterThanOrEqual(5);

      for (const item of body.items) {
        expect(item).toHaveProperty('interviewId');
        expect(item).toHaveProperty('candidateName');
        expect(item).toHaveProperty('overallScore');
        expect(item).toHaveProperty('technicalDepth');
        expect(item).toHaveProperty('communication');
        expect(item).toHaveProperty('domainExperience');
        expect(item).toHaveProperty('problemSolving');
        expect(item).toHaveProperty('confidence');
      }
    });
  });

  // ============================================================
  // GET /analytics/details?type=skills
  // ============================================================
  describe('GET /analytics/details?type=skills', () => {
    it('returns skill gaps per candidate with top skills', async () => {
      await seedCompleted('Skill A', 'skill.a@example.com', {
        gaps: ['Docker', 'Kubernetes'],
      });
      await seedCompleted('Skill B', 'skill.b@example.com', {
        gaps: ['Docker'],
      });

      const { body } = await api()
        .get('/analytics/details?type=skills&range=30d')
        .expect(200);

      expect(Array.isArray(body.items)).toBe(true);
      expect(Array.isArray(body.topSkills)).toBe(true);

      for (const item of body.items) {
        expect(item).toHaveProperty('interviewId');
        expect(item).toHaveProperty('candidateName');
        expect(item).toHaveProperty('skillNames');
        expect(item).toHaveProperty('count');
        expect(Array.isArray(item.skillNames)).toBe(true);
      }

      const docker = body.topSkills.find((s: any) => s.skill === 'Docker');
      expect(docker).toBeDefined();
      expect(docker.count).toBeGreaterThanOrEqual(2);
    });
  });

  // ============================================================
  // GET /analytics/details?type=needs-review
  // ============================================================
  describe('GET /analytics/details?type=needs-review', () => {
    it('returns interviews needing review with word counts', async () => {
      await seedNeedsReview('Review A', 'review.a@example.com');

      const { body } = await api()
        .get('/analytics/details?type=needs-review&range=30d')
        .expect(200);

      expect(Array.isArray(body.items)).toBe(true);
      expect(body.items.length).toBeGreaterThanOrEqual(1);

      for (const item of body.items) {
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('candidateName');
        expect(item).toHaveProperty('candidateEmail');
        expect(item).toHaveProperty('transcriptWords');
        expect(item).toHaveProperty('createdAt');
        expect(typeof item.transcriptWords).toBe('number');
      }
    });
  });
});