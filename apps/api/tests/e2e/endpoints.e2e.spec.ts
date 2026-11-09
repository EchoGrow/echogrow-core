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
  attachBulkFiles,
  validBulkPair,
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

    // ============================================================
    // timeSaved field
    // ============================================================
    it('returns a computed timeSaved object when status is COMPLETED', async () => {
      const s = await seedSession(prisma, {
        status: 'COMPLETED',
        isScored: true,
        isVerified: true,
        isPlanned: true,
        transcript: 'x '.repeat(300),
        resume: 'y '.repeat(100),
      });
      await seedScorecard(prisma, s.id, {
        scores: [2, 4, 2, 3],
        discrepancies: 2,
        gaps: ['Docker'],
      });

      // Simulate processing time by adjusting updatedAt in the DB
      await prisma.interviewSession.update({
        where: { id: s.id },
        data: {
          createdAt: new Date(Date.now() - 90_000),
          updatedAt: new Date(),
        },
      });

      const { body } = await api().get(`/interviews/${s.id}/scorecard`).expect(200);
      expect(body.status).toBe('scored');
      expect(body.timeSaved).toBeDefined();
      expect(body.timeSaved.manualMinutes).toBeGreaterThan(5);
      expect(body.timeSaved.echoGrowSeconds).toBeGreaterThanOrEqual(0);
      expect(body.timeSaved.echoGrowSeconds).toBeLessThanOrEqual(180);
      expect(body.timeSaved.savedSeconds).toBeGreaterThan(0);
      expect(typeof body.timeSaved.savedMinutes).toBe('number');
    });

    it('caps echoGrowSeconds at 180 seconds even when the pipeline took longer', async () => {
      const s = await seedSession(prisma, {
        status: 'COMPLETED',
        isScored: true,
        isVerified: true,
        isPlanned: true,
        transcript: 'x '.repeat(300),
        resume: 'y '.repeat(100),
      });
      await seedScorecard(prisma, s.id, { scores: [3, 3, 3, 3], discrepancies: 0, gaps: [] });

      await prisma.interviewSession.update({
        where: { id: s.id },
        data: {
          createdAt: new Date(Date.now() - 600_000),
          updatedAt: new Date(),
        },
      });

      const { body } = await api().get(`/interviews/${s.id}/scorecard`).expect(200);
      expect(body.timeSaved.echoGrowSeconds).toBe(180);
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
        expect(d.field).toMatch(/^team_size_/);
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
      expect(db?.status).toBe('PENDING');
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
        expect(db?.status).toBe(status);
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

  // ============================================================
  // GET /interviews/:id/spk-export
  // ============================================================
  describe('GET /interviews/:id/spk-export', () => {
    it('404 for unknown interview', async () => {
      await api().get('/interviews/does-not-exist/spk-export').expect(404);
    });

    it('400 when the interview is not COMPLETED yet', async () => {
      const s = await seedSession(prisma, { status: 'PROCESSING' });
      await api().get(`/interviews/${s.id}/spk-export`).expect(400);
    });

    it('404 when the SPK profile has not been built yet', async () => {
      const s = await seedSession(prisma, { status: 'COMPLETED' });
      await seedScorecard(prisma, s.id, { scores: [4, 4, 4, 4], discrepancies: 0, gaps: [] });

      await api().get(`/interviews/${s.id}/spk-export`).expect(404);
    });

    it('200 with a fully shaped SPK payload when the profile exists', async () => {
      const s = await seedSession(prisma, {
        status: 'COMPLETED',
        isScored: true,
        isVerified: true,
        isPlanned: true,
        name: 'SPK User',
      });
      await seedScorecard(prisma, s.id, {
        scores: [2, 4, 3, 2],
        discrepancies: 1,
        gaps: ['Kubernetes', 'Docker'],
      });

      const scorecard = await prisma.scorecard.findUnique({ where: { interviewId: s.id } });
      const discrepancy = await prisma.discrepancy.findFirst({
        where: { scorecardId: scorecard!.id },
      });

      await prisma.spkProfile.create({
        data: {
          interviewId: s.id,
          seniority: 'Mid-level',
          primaryRole: 'Backend Developer',
          timezone: 'UTC+3',
          languages: ['English', 'Arabic'] as any,
          yearsOfExperience: 3,
          schemaVersion: '1.0.0',
          spkPayload: {
            candidate_id: s.candidateId,
            candidate_name: 'SPK User',
            overall_score: 55,
            confidence: 0.9,
            dimensions: [
              {
                name: 'Technical Depth',
                score: 40,
                raw_score: 2,
                reason: 'Weak on optimization',
                evidence_quote: 'I never used EXPLAIN',
                evidence_timestamp: '00:03:15',
              },
              {
                name: 'Communication Clarity',
                score: 80,
                raw_score: 4,
                reason: 'Clear',
                evidence_quote: 'Let me explain...',
                evidence_timestamp: '00:01:00',
              },
              {
                name: 'Domain Experience',
                score: 60,
                raw_score: 3,
                reason: 'Some gaps',
                evidence_quote: 'I built monoliths',
                evidence_timestamp: '00:02:10',
              },
              {
                name: 'Problem Solving',
                score: 40,
                raw_score: 2,
                reason: 'Naive approach',
                evidence_quote: 'I guessed',
                evidence_timestamp: '00:04:30',
              },
            ],
            verified_skills: ['Node.js', 'Express', 'JWT'],
            recommended_upskilling: [
              { skill: 'Kubernetes', priority: 'MEDIUM' },
              { skill: 'Docker', priority: 'MEDIUM' },
            ],
            roadmap: [
              {
                week: 1,
                skill: 'Kubernetes',
                task: 'Learn fundamentals',
                resource_url: 'https://kubernetes.io/docs/',
              },
              {
                week: 2,
                skill: 'Docker',
                task: 'Practice Dockerfile',
                resource_url: 'https://docs.docker.com/',
              },
            ],
            discrepancies: [
              {
                field: discrepancy!.claim,
                cv_says: discrepancy!.cvQuote ?? '',
                interview_says: discrepancy!.interviewQuote ?? '',
                status: 'pending',
                confidence: 0.9,
              },
            ],
            discrepancies_count: 1,
            human_review_status: 'pending',
            seniority: 'Mid-level',
            primary_role: 'Backend Developer',
            timezone: 'UTC+3',
            languages: ['English', 'Arabic'],
            years_of_experience: 3,
            generated_at: new Date().toISOString(),
            schema_version: '1.0.0',
          },
        },
      });

      const { body } = await api().get(`/interviews/${s.id}/spk-export`).expect(200);

      expect(body.candidate_id).toBe(s.candidateId);
      expect(body.candidate_name).toBe('SPK User');
      expect(body.overall_score).toBe(55);
      expect(body.confidence).toBe(0.9);
      expect(body.dimensions).toHaveLength(4);
      expect(body.verified_skills).toEqual(['Node.js', 'Express', 'JWT']);
      expect(body.recommended_upskilling).toHaveLength(2);
      expect(body.roadmap).toHaveLength(2);
      expect(body.roadmap[0].week).toBe(1);
      expect(body.roadmap[1].week).toBe(2);
      expect(body.discrepancies).toHaveLength(1);
      expect(body.discrepancies_count).toBe(1);
      expect(body.human_review_status).toBe('pending');
      expect(body.seniority).toBe('Mid-level');
      expect(body.primary_role).toBe('Backend Developer');
      expect(body.schema_version).toBe('1.0.0');
      expect(body.generated_at).toBeTruthy();
    });
  });

  // ============================================================
  // POST /interviews/:id/spk-rebuild
  // ============================================================
  describe('POST /interviews/:id/spk-rebuild', () => {
    it('404 for unknown interview', async () => {
      const res = await api().post('/interviews/does-not-exist/spk-rebuild').expect(404);
      expect(res.body.message).toMatch(/not found/i);
    });

    it('201 and returns { interviewId, status: "rebuilt" }', async () => {
      const s = await seedSession(prisma, { status: 'COMPLETED' });
      await seedScorecard(prisma, s.id, { scores: [3, 3, 3, 3], discrepancies: 0, gaps: [] });

      const { body } = await api().post(`/interviews/${s.id}/spk-rebuild`).expect(201);
      expect(body.interviewId).toBe(s.id);
      expect(body.status).toBe('rebuilt');
    });
  });

  // ============================================================
  // POST /interviews/bulk-upload
  // ============================================================
  describe('POST /interviews/bulk-upload', () => {
    it('400 when no files are attached', async () => {
      await api()
        .post('/interviews/bulk-upload')
        .field('metadata', JSON.stringify([]))
        .expect(400);
    });

    it('400 when metadata field is missing', async () => {
      const req = api().post('/interviews/bulk-upload');
      req.attach('files', Buffer.from(SHORT_TRANSCRIPT), 'transcript.txt');
      await req.expect(400);
    });

    it('400 when metadata is not valid JSON', async () => {
      const req = api().post('/interviews/bulk-upload').field('metadata', 'not-json{');
      req.attach('files', Buffer.from(SHORT_TRANSCRIPT), 'transcript.txt');
      await req.expect(400);
    });

    it('400 when metadata is not an array', async () => {
      const req = api()
        .post('/interviews/bulk-upload')
        .field('metadata', JSON.stringify({ candidateName: 'X' }));
      req.attach('files', Buffer.from(SHORT_TRANSCRIPT), 'transcript.txt');
      await req.expect(400);
    });

    it('400 when metadata is empty array', async () => {
      const req = api()
        .post('/interviews/bulk-upload')
        .field('metadata', JSON.stringify([]));
      req.attach('files', Buffer.from(SHORT_TRANSCRIPT), 'transcript.txt');
      await req.expect(400);
    });

    it('400 when more than 50 candidates are submitted', async () => {
      const metadata = Array.from({ length: 51 }, (_, i) => ({
        candidateName: `C${i}`,
        candidateEmail: `c${i}.bulk@example.com`,
        transcriptFileName: `t${i}.txt`,
        resumeFileName: `r${i}.txt`,
      }));

      const req = api()
        .post('/interviews/bulk-upload')
        .field('metadata', JSON.stringify(metadata));
      req.attach('files', Buffer.from(SHORT_TRANSCRIPT), 't0.txt');

      const res = await req.expect(400);
      expect(res.body.message).toMatch(/Too many candidates/);
      expect(res.body.message).toMatch(/51/);
      expect(res.body.message).toMatch(/50/);
    });

    it('400 when metadata contains an invalid candidate shape', async () => {
      const metadata = [
        {
          candidateName: 'A',
          candidateEmail: 'not-an-email',
          transcriptFileName: '',
          resumeFileName: '',
        },
      ];
      const req = api()
        .post('/interviews/bulk-upload')
        .field('metadata', JSON.stringify(metadata));
      req.attach('files', Buffer.from(SHORT_TRANSCRIPT), 't.txt');
      await req.expect(400);
    });

    it('201 with a single valid candidate pair', async () => {
      const pair = validBulkPair('single');
      const req = api()
        .post('/interviews/bulk-upload')
        .field('metadata', JSON.stringify([pair.metadata]));
      attachBulkFiles(req, [pair.transcript, pair.resume]);

      const res = await req.expect(201);
      expect(res.body.summary).toEqual({
        total: 1,
        queued: 1,
        failed: 0,
        rejectedFilesCount: 0,
      });
      expect(res.body.results).toHaveLength(1);
      expect(res.body.results[0].status).toBe('queued');
      expect(res.body.results[0].interviewId).toBeTruthy();
      expect(res.body.rejectedFiles).toEqual([]);

      await pollNeedsReview(res.body.results[0].interviewId);

      const session = await prisma.interviewSession.findUnique({
        where: { id: res.body.results[0].interviewId },
        include: { candidate: true },
      });
      expect(session?.candidate.email).toBe(pair.metadata.candidateEmail);
    }, 60_000);

    it('201 with 3 candidates, all queued', async () => {
      const pairs = [validBulkPair('m1'), validBulkPair('m2'), validBulkPair('m3')];
      const req = api()
        .post('/interviews/bulk-upload')
        .field('metadata', JSON.stringify(pairs.map((p) => p.metadata)));
      attachBulkFiles(req, pairs.flatMap((p) => [p.transcript, p.resume]));

      const res = await req.expect(201);
      expect(res.body.summary).toEqual({
        total: 3,
        queued: 3,
        failed: 0,
        rejectedFilesCount: 0,
      });
      expect(res.body.results.every((r: any) => r.status === 'queued')).toBe(true);

      for (const r of res.body.results) {
        await pollNeedsReview(r.interviewId);
      }
    }, 120_000);

    it('201 with mixed results: one queued, one failed (missing file)', async () => {
      const ok = validBulkPair('ok');
      const missing = {
        candidateName: 'Missing File',
        candidateEmail: 'missing.bulk@example.com',
        transcriptFileName: 'never-uploaded.txt',
        resumeFileName: 'also-never-uploaded.txt',
      };

      const req = api()
        .post('/interviews/bulk-upload')
        .field('metadata', JSON.stringify([ok.metadata, missing]));
      attachBulkFiles(req, [ok.transcript, ok.resume]);

      const res = await req.expect(201);
      expect(res.body.summary.total).toBe(2);
      expect(res.body.summary.queued).toBe(1);
      expect(res.body.summary.failed).toBe(1);

      const queued = res.body.results.find((r: any) => r.status === 'queued');
      const failed = res.body.results.find((r: any) => r.status === 'error');
      expect(queued.interviewId).toBeTruthy();
      expect(failed.error).toMatch(/Transcript file .* not uploaded/);

      await pollNeedsReview(queued.interviewId);
    }, 60_000);

    it('201 with one failed candidate because transcript is too short', async () => {
      const metadata = {
        candidateName: 'Short Transcript',
        candidateEmail: 'short.bulk@example.com',
        transcriptFileName: 'short.txt',
        resumeFileName: 'short-resume.txt',
      };

      const req = api()
        .post('/interviews/bulk-upload')
        .field('metadata', JSON.stringify([metadata]));
      req.attach('files', Buffer.from('too short'), 'short.txt');
      req.attach('files', Buffer.from(SHORT_CV), 'short-resume.txt');

      const res = await req.expect(201);
      expect(res.body.summary.total).toBe(1);
      expect(res.body.summary.queued).toBe(0);
      expect(res.body.summary.failed).toBe(1);
      expect(res.body.results[0].status).toBe('error');
      expect(res.body.results[0].error).toMatch(/Transcript is too short/);
      expect(res.body.results[0].error).toMatch(/< 40 chars/);
    });

    it('201 rejects files larger than 2MB individually, processes the rest', async () => {
      const ok = validBulkPair('ok2');
      const bigFile = {
        filename: 'big-resume.txt',
        content: Buffer.alloc(3 * 1024 * 1024, 'A'),
      };
      const bigCandidate = {
        candidateName: 'Big Resume',
        candidateEmail: 'big.bulk@example.com',
        transcriptFileName: ok.transcript.filename,
        resumeFileName: bigFile.filename,
      };

      const req = api()
        .post('/interviews/bulk-upload')
        .field('metadata', JSON.stringify([bigCandidate]));
      req.attach('files', bigFile.content, bigFile.filename);
      req.attach('files', Buffer.from(SHORT_TRANSCRIPT), ok.transcript.filename);

      const res = await req.expect(201);
      expect(res.body.rejectedFiles).toHaveLength(1);
      expect(res.body.rejectedFiles[0].filename).toBe('big-resume.txt');
      expect(res.body.rejectedFiles[0].reason).toMatch(/too large/);
      expect(res.body.rejectedFiles[0].sizeBytes).toBe(3 * 1024 * 1024);
      expect(res.body.summary.rejectedFilesCount).toBe(1);
      expect(res.body.summary.failed).toBe(1);
      expect(res.body.results[0].error).toMatch(/Resume file .* was not uploaded or was rejected/);
    });

    it('201 rejects empty files individually', async () => {
      const metadata = {
        candidateName: 'Empty File',
        candidateEmail: 'empty.bulk@example.com',
        transcriptFileName: 'empty.txt',
        resumeFileName: 'empty-resume.txt',
      };

      const req = api()
        .post('/interviews/bulk-upload')
        .field('metadata', JSON.stringify([metadata]));
      req.attach('files', Buffer.alloc(0), 'empty.txt');
      req.attach('files', Buffer.from(SHORT_CV), 'empty-resume.txt');

      const res = await req.expect(201);
      expect(res.body.rejectedFiles).toHaveLength(1);
      expect(res.body.rejectedFiles[0].filename).toBe('empty.txt');
      expect(res.body.rejectedFiles[0].reason).toMatch(/empty/);
      expect(res.body.rejectedFiles[0].sizeBytes).toBe(0);
      expect(res.body.summary.failed).toBe(1);
    });

    it('matches filenames case-insensitively', async () => {
      const metadata = {
        candidateName: 'Case Test',
        candidateEmail: 'case.bulk@example.com',
        transcriptFileName: 'TRANSCRIPT.TXT',
        resumeFileName: 'RESUME.TXT',
      };

      const req = api()
        .post('/interviews/bulk-upload')
        .field('metadata', JSON.stringify([metadata]));
      req.attach('files', Buffer.from(SHORT_TRANSCRIPT), 'transcript.txt');
      req.attach('files', Buffer.from(SHORT_CV), 'resume.txt');

      const res = await req.expect(201);
      expect(res.body.summary.queued).toBe(1);

      await pollNeedsReview(res.body.results[0].interviewId);
    }, 60_000);

    it('creates a separate session when the same file is uploaded twice', async () => {
      const pair = validBulkPair('dup');

      const req1 = api()
        .post('/interviews/bulk-upload')
        .field('metadata', JSON.stringify([pair.metadata]));
      attachBulkFiles(req1, [pair.transcript, pair.resume]);
      const res1 = await req1.expect(201);
      await pollNeedsReview(res1.body.results[0].interviewId);

      const req2 = api()
        .post('/interviews/bulk-upload')
        .field('metadata', JSON.stringify([pair.metadata]));
      attachBulkFiles(req2, [pair.transcript, pair.resume]);
      const res2 = await req2.expect(201);
      await pollNeedsReview(res2.body.results[0].interviewId);

      const sessions = await prisma.interviewSession.count({
        where: { candidate: { email: pair.metadata.candidateEmail } },
      });
      expect(sessions).toBe(2);
    }, 120_000);
  });
});