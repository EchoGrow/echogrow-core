import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/modules/prisma/prisma.service';
import {
  createTestApp,
  closeTestApp,
  seedSession,
  seedScorecard,
  waitForPipeline,
  sha256,
  SHORT_TRANSCRIPT,
  SHORT_CV,
} from './setup';

describe('E2E: REST endpoints (no LLM calls)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const api = () => request(app.getHttpServer());

  const pollNeedsReview = (id: string) =>
    waitForPipeline(
      async () => (await api().get(`/interviews/${id}/scorecard`).expect(200)).body,
      { expectedStatus: 'needs_review', maxAttempts: 30, intervalMs: 1_000 },
    );

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  afterAll(async () => {
    await closeTestApp(app, prisma);
  });

  // ============================================================
  // POST /interviews/upload
  // ============================================================
  describe('POST /interviews/upload', () => {
    const valid = {
      candidateName: 'Upload Tester',
      candidateEmail: 'upload.ok@example.com',
      transcript: SHORT_TRANSCRIPT,
      cv: SHORT_CV,
    };

    it.each([
      ['empty body', {}],
      ['missing candidateName', { candidateName: undefined }],
      ['name shorter than 2 chars', { candidateName: 'A' }],
      ['invalid email', { candidateEmail: 'not-an-email' }],
      ['transcript shorter than 40 chars', { transcript: 'too short' }],
      ['cv shorter than 20 chars', { cv: 'tiny' }],
    ])('returns 400 for %s', async (_label, patch) => {
      const body = _label === 'empty body' ? {} : { ...valid, ...patch };
      await api().post('/interviews/upload').send(body).expect(400);
    });

    it('returns 201 {interviewId, status:"queued"} and stores hashes + candidate', async () => {
      const res = await api().post('/interviews/upload').send(valid).expect(201);
      expect(res.body.interviewId).toBeTruthy();
      expect(res.body.status).toBe('queued');

      // wait for the (LLM-free) job to finish so cleanup doesn't race the worker
      await pollNeedsReview(res.body.interviewId);

      const session = await prisma.interviewSession.findUnique({
        where: { id: res.body.interviewId },
        include: { candidate: true },
      });
      expect(session?.transcriptHash).toBe(sha256(valid.transcript));
      expect(session?.resumeHash).toBe(sha256(valid.cv));
      expect(session?.candidate.email).toBe(valid.candidateEmail);
    }, 60_000);

    it('reuses the candidate by email and creates a separate session per upload', async () => {
      const second = await api().post('/interviews/upload').send(valid).expect(201);
      await pollNeedsReview(second.body.interviewId);

      const candidates = await prisma.candidate.count({ where: { email: valid.candidateEmail } });
      const sessions = await prisma.interviewSession.count({
        where: { candidate: { email: valid.candidateEmail } },
      });
      expect(candidates).toBe(1);
      expect(sessions).toBeGreaterThanOrEqual(2);
    }, 60_000);
  });

  // ============================================================
  // GET /interviews/:id/scorecard
  // ============================================================
  describe('GET /interviews/:id/scorecard', () => {
    it('404 for unknown id', async () => {
      await api().get('/interviews/does-not-exist/scorecard').expect(404);
    });

    it.each(['QUEUED', 'PROCESSING'] as const)('returns "processing" for %s', async (status) => {
      const s = await seedSession(prisma, { status, name: 'Proc User' });
      const { body } = await api().get(`/interviews/${s.id}/scorecard`).expect(200);
      expect(body.status).toBe('processing');
      expect(body.interviewId).toBe(s.id);
      expect(body.candidateName).toBe('Proc User');
      expect(body.progress).toEqual({ isScored: false, isVerified: false, isPlanned: false });
    });

    it('returns "needs_review" with transcript, resume and structuredTranscript', async () => {
      const s = await seedSession(prisma, {
        status: 'NEEDS_REVIEW',
        structuredTranscript: [{ speaker: 'Interviewer', text: 'Hi', timestamp: '00:00:00' }],
      });
      const { body } = await api().get(`/interviews/${s.id}/scorecard`).expect(200);
      expect(body.status).toBe('needs_review');
      expect(body.transcript).toBe(SHORT_TRANSCRIPT);
      expect(body.resume).toBe(SHORT_CV);
      expect(Array.isArray(body.structuredTranscript)).toBe(true);
      expect(typeof body.confidence).toBe('number');
    });

    it('returns "failed"', async () => {
      const s = await seedSession(prisma, { status: 'FAILED' });
      const { body } = await api().get(`/interviews/${s.id}/scorecard`).expect(200);
      expect(body.status).toBe('failed');
    });

    it('returns "rejected"', async () => {
      const s = await seedSession(prisma, { status: 'REJECTED' });
      const { body } = await api().get(`/interviews/${s.id}/scorecard`).expect(200);
      expect(body.status).toBe('rejected');
    });

    it('returns "scored" with 4 dimensions, pendingDiscrepancies and skillGaps', async () => {
      const s = await seedSession(prisma, {
        status: 'COMPLETED',
        name: 'Scored User',
        isScored: true,
        isVerified: true,
        isPlanned: true,
      });
      await seedScorecard(prisma, s.id, {
        scores: [1, 4, 3, 2],
        discrepancies: 2,
        gaps: ['Kubernetes', 'Terraform', 'Kafka'],
      });

      const { body } = await api().get(`/interviews/${s.id}/scorecard`).expect(200);
      expect(body.status).toBe('scored');
      expect(body.candidateName).toBe('Scored User');
      expect(body.interviewDate).toBeTruthy();
      expect(body.dimensions).toHaveLength(4);
      expect(body.dimensions.map((d: any) => d.score).sort()).toEqual([1, 2, 3, 4]);
      for (const d of body.dimensions) {
        expect(d.name).toBeTruthy();
        expect(d.reason).toBeTruthy();
        expect(d.evidenceQuote).toBeTruthy();
      }
      expect(body.overallConfidence).toBeCloseTo(0.9);
      expect(body.pendingDiscrepancies).toBe(2);
      expect(body.skillGaps).toBe(3);
    });
  });

  // ============================================================
  // GET /interviews/:id/discrepancies
  // ============================================================
  describe('GET /interviews/:id/discrepancies', () => {
    it('404 for unknown interview', async () => {
      await api().get('/interviews/does-not-exist/discrepancies').expect(404);
    });

    it('200 with an empty list when the scorecard does not exist yet', async () => {
      const s = await seedSession(prisma, { status: 'PROCESSING' });
      const { body } = await api().get(`/interviews/${s.id}/discrepancies`).expect(200);
      expect(body).toEqual({ discrepancies: [] });
    });

    it('200 with an empty list when there are none', async () => {
      const s = await seedSession(prisma, { status: 'COMPLETED' });
      await seedScorecard(prisma, s.id, { discrepancies: 0 });
      const { body } = await api().get(`/interviews/${s.id}/discrepancies`).expect(200);
      expect(body).toEqual({ discrepancies: [] });
    });

    it('200 with correctly shaped discrepancies', async () => {
      const s = await seedSession(prisma, { status: 'COMPLETED' });
      await seedScorecard(prisma, s.id, { discrepancies: 2 });
      const { body } = await api().get(`/interviews/${s.id}/discrepancies`).expect(200);

      expect(body.discrepancies).toHaveLength(2);
      for (const d of body.discrepancies) {
        expect(d.id).toBeTruthy();
        expect(d.field).toMatch(/^team_size_/); // DB "claim" is exposed as "field"
        expect(d.cvQuote).toBeTruthy();
        expect(d.interviewQuote).toBeTruthy();
        expect(d.confidence).toBe(0.9);
        expect(d.status).toBe('pending');
        expect(d.action).toBe('flag_for_human_review');
      }
    });
  });

  // ============================================================
  // PATCH /discrepancies/:id
  // ============================================================
  describe('PATCH /discrepancies/:id', () => {
    const setup = async (count = 1) => {
      const s = await seedSession(prisma, { status: 'COMPLETED' });
      return seedScorecard(prisma, s.id, { discrepancies: count });
    };

    it('confirms a discrepancy', async () => {
      const { discrepancyIds } = await setup();
      const { body } = await api()
        .patch(`/discrepancies/${discrepancyIds[0]}`)
        .send({ status: 'confirmed' })
        .expect(200);
      expect(body.id).toBe(discrepancyIds[0]);
      expect(body.status).toBe('CONFIRMED');
      expect(body.reviewedAt).toBeTruthy();

      const db = await prisma.discrepancy.findUnique({ where: { id: discrepancyIds[0] } });
      expect(db?.status).toBe('CONFIRMED');
      expect(db?.reviewedAt).toBeTruthy();
    });

    it('dismisses a discrepancy', async () => {
      const { discrepancyIds } = await setup();
      const { body } = await api()
        .patch(`/discrepancies/${discrepancyIds[0]}`)
        .send({ status: 'dismissed' })
        .expect(200);
      expect(body.status).toBe('DISMISSED');
      expect(body.reviewedAt).toBeTruthy();
    });

    it.each([
      ['unknown status value', { status: 'maybe' }],
      ['"pending" is not allowed', { status: 'pending' }],
      ['missing status', {}],
    ])('400 for %s', async (_label, payload) => {
      const { discrepancyIds } = await setup();
      await api().patch(`/discrepancies/${discrepancyIds[0]}`).send(payload).expect(400);

      const db = await prisma.discrepancy.findUnique({ where: { id: discrepancyIds[0] } });
      expect(db?.status).toBe('PENDING'); // unchanged
    });

    it('404 for unknown discrepancy', async () => {
      await api().patch('/discrepancies/does-not-exist').send({ status: 'confirmed' }).expect(404);
    });

    it('reviewed discrepancies reduce pendingDiscrepancies in the scorecard', async () => {
      const s = await seedSession(prisma, { status: 'COMPLETED' });
      const { discrepancyIds } = await seedScorecard(prisma, s.id, { discrepancies: 2 });

      await api().patch(`/discrepancies/${discrepancyIds[0]}`).send({ status: 'confirmed' }).expect(200);

      const { body } = await api().get(`/interviews/${s.id}/scorecard`).expect(200);
      expect(body.pendingDiscrepancies).toBe(1);
    });
  });

  // ============================================================
  // GET /interviews/:id/roadmap
  // ============================================================
  describe('GET /interviews/:id/roadmap', () => {
    it('404 for unknown interview', async () => {
      await api().get('/interviews/does-not-exist/roadmap').expect(404);
    });

    it('404 when the interview has no scorecard', async () => {
      const s = await seedSession(prisma, { status: 'PROCESSING' });
      await api().get(`/interviews/${s.id}/roadmap`).expect(404);
    });

    it('200 with empty arrays when there are no gaps', async () => {
      const s = await seedSession(prisma, { status: 'COMPLETED' });
      await seedScorecard(prisma, s.id, { gaps: [] });
      const { body } = await api().get(`/interviews/${s.id}/roadmap`).expect(200);
      expect(body).toEqual({ gaps: [], roadmap: [] });
    });

    it('200 with gaps and sequential weekly roadmap', async () => {
      const s = await seedSession(prisma, { status: 'COMPLETED' });
      await seedScorecard(prisma, s.id, { gaps: ['Kubernetes', 'Terraform', 'Kafka'] });

      const { body } = await api().get(`/interviews/${s.id}/roadmap`).expect(200);
      expect(body.gaps.map((g: any) => g.skillName).sort()).toEqual(['Kafka', 'Kubernetes', 'Terraform']);
      for (const g of body.gaps) expect(g.priority).toBe('MEDIUM');

      expect(body.roadmap).toHaveLength(3);
      body.roadmap.forEach((item: any, i: number) => {
        expect(item.week).toBe(i + 1);
        expect(item.task).toBeTruthy();
        expect(item.skillName).toBeTruthy();
        expect(item.resourceUrl).toMatch(/^https?:\/\//);
      });
    });
  });

  // ============================================================
  // POST /interviews/:id/force-evaluate (guards only)
  // ============================================================
  describe('POST /interviews/:id/force-evaluate (guards)', () => {
    it('404 for unknown interview', async () => {
      await api().post('/interviews/does-not-exist/force-evaluate').expect(404);
    });

    it.each(['QUEUED', 'PROCESSING', 'COMPLETED', 'REJECTED'] as const)(
      '400 when status is %s',
      async (status) => {
        const s = await seedSession(prisma, { status });
        await api().post(`/interviews/${s.id}/force-evaluate`).expect(400);

        const db = await prisma.interviewSession.findUnique({ where: { id: s.id } });
        expect(db?.status).toBe(status); // unchanged
      },
    );
  });

  // ============================================================
  // POST /interviews/:id/reject
  // ============================================================
  describe('POST /interviews/:id/reject', () => {
    it('404 for unknown interview', async () => {
      await api().post('/interviews/does-not-exist/reject').expect(404);
    });

    it('201 and sets REJECTED when status is NEEDS_REVIEW', async () => {
      const s = await seedSession(prisma, { status: 'NEEDS_REVIEW' });
      const { body } = await api().post(`/interviews/${s.id}/reject`).expect(201);
      expect(body).toEqual({ interviewId: s.id, status: 'rejected' });

      const db = await prisma.interviewSession.findUnique({ where: { id: s.id } });
      expect(db?.status).toBe('REJECTED');
    });

    it.each(['QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'REJECTED'] as const)(
      '400 when status is %s',
      async (status) => {
        const s = await seedSession(prisma, { status });
        await api().post(`/interviews/${s.id}/reject`).expect(400);
      },
    );
  });
});