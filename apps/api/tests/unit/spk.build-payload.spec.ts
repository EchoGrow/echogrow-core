import { describe, it, expect } from 'vitest';
import { SpkService } from '../../src/modules/spk/spk.service';

/**
 * These tests exercise `buildPayload` directly. They do not touch the DB
 * and do not call the LLM. All inputs are plain objects that mimic the shape
 * of the Prisma result that `buildSpkProfile` would produce.
 *
 * They verify the two rules that were added on top of the original
 * acceptance criteria:
 *   1. `verified_skills` must not contain any skill that also appears in
 *      `recommended_upskilling` (case-insensitive substring match).
 *   2. `roadmap` must be sorted by `week` ascending, regardless of the order
 *      the LLM returned it in.
 */
describe('SpkService.buildPayload', () => {
  const service = new SpkService({} as any, {} as any);

  const session = (scorecardOverrides: any = {}, extra: any = {}) => ({
    candidateId: 'cand_1',
    candidate: { name: 'Candidate One' },
    scorecard: {
      confidence: 0.9,
      dimensions: [
        {
          dimensionType: 'TECHNICAL_DEPTH',
          score: 3,
          reason: 'ok',
          evidenceQuote: { quote: 'q1', timestamp: '00:01' },
          skillGaps: [],
        },
        {
          dimensionType: 'COMMUNICATION',
          score: 3,
          reason: 'ok',
          evidenceQuote: { quote: 'q2', timestamp: '00:02' },
          skillGaps: [],
        },
        {
          dimensionType: 'DOMAIN_EXPERIENCE',
          score: 3,
          reason: 'ok',
          evidenceQuote: { quote: 'q3', timestamp: '00:03' },
          skillGaps: [],
        },
        {
          dimensionType: 'PROBLEM_SOLVING',
          score: 3,
          reason: 'ok',
          evidenceQuote: { quote: 'q4', timestamp: '00:04' },
          skillGaps: [],
        },
      ],
      discrepancies: [],
      roadmap: null,
      ...scorecardOverrides,
    },
    ...extra,
  });

  const metadata = {
    seniority: null,
    primary_role: null,
    timezone: null,
    languages: null,
    years_of_experience: null,
  };

  // ============================================================
  // Rule 1: verified_skills must not contain gap skills
  // ============================================================
  it('removes gap skills from verified_skills (exact match)', () => {
    const s = session({
      dimensions: [
        {
          dimensionType: 'TECHNICAL_DEPTH',
          score: 2,
          reason: 'weak',
          evidenceQuote: { quote: 'q1', timestamp: '00:01' },
          skillGaps: [{ skillName: 'Docker', priority: 'MEDIUM' }],
        },
        {
          dimensionType: 'COMMUNICATION',
          score: 3,
          reason: 'ok',
          evidenceQuote: { quote: 'q2', timestamp: '00:02' },
          skillGaps: [],
        },
        {
          dimensionType: 'DOMAIN_EXPERIENCE',
          score: 3,
          reason: 'ok',
          evidenceQuote: { quote: 'q3', timestamp: '00:03' },
          skillGaps: [],
        },
        {
          dimensionType: 'PROBLEM_SOLVING',
          score: 3,
          reason: 'ok',
          evidenceQuote: { quote: 'q4', timestamp: '00:04' },
          skillGaps: [],
        },
      ],
    });

    const verified = ['React', 'TypeScript', 'Docker'];
    const payload = (service as any).buildPayload(s, metadata, verified);

    expect(payload.verified_skills).toEqual(['React', 'TypeScript']);
    expect(payload.recommended_upskilling.map((u: any) => u.skill)).toEqual(['Docker']);
  });

  it('removes gap skills from verified_skills (partial / substring match)', () => {
    const s = session({
      dimensions: [
        {
          dimensionType: 'TECHNICAL_DEPTH',
          score: 2,
          reason: 'weak',
          evidenceQuote: { quote: 'q1', timestamp: '00:01' },
          skillGaps: [{ skillName: 'Docker', priority: 'MEDIUM' }],
        },
        {
          dimensionType: 'COMMUNICATION',
          score: 3,
          reason: 'ok',
          evidenceQuote: { quote: 'q2', timestamp: '00:02' },
          skillGaps: [],
        },
        {
          dimensionType: 'DOMAIN_EXPERIENCE',
          score: 3,
          reason: 'ok',
          evidenceQuote: { quote: 'q3', timestamp: '00:03' },
          skillGaps: [],
        },
        {
          dimensionType: 'PROBLEM_SOLVING',
          score: 3,
          reason: 'ok',
          evidenceQuote: { quote: 'q4', timestamp: '00:04' },
          skillGaps: [],
        },
      ],
    });

    const verified = [
      'React',
      'Dockerfile',       // contains "Docker" → must be removed
      'Docker Compose',   // contains "Docker" → must be removed
      'Docker Swarm',     // contains "Docker" → must be removed
      'TypeScript',
    ];
    const payload = (service as any).buildPayload(s, metadata, verified);

    expect(payload.verified_skills).toEqual(['React', 'TypeScript']);
    expect(payload.recommended_upskilling.map((u: any) => u.skill)).toEqual(['Docker']);
  });

  it('keeps skills that are not gaps, even if they look similar', () => {
    const s = session({
      dimensions: [
        {
          dimensionType: 'TECHNICAL_DEPTH',
          score: 2,
          reason: 'weak',
          evidenceQuote: { quote: 'q1', timestamp: '00:01' },
          skillGaps: [{ skillName: 'Kubernetes', priority: 'MEDIUM' }],
        },
        {
          dimensionType: 'COMMUNICATION',
          score: 3,
          reason: 'ok',
          evidenceQuote: { quote: 'q2', timestamp: '00:02' },
          skillGaps: [],
        },
        {
          dimensionType: 'DOMAIN_EXPERIENCE',
          score: 3,
          reason: 'ok',
          evidenceQuote: { quote: 'q3', timestamp: '00:03' },
          skillGaps: [],
        },
        {
          dimensionType: 'PROBLEM_SOLVING',
          score: 3,
          reason: 'ok',
          evidenceQuote: { quote: 'q4', timestamp: '00:04' },
          skillGaps: [],
        },
      ],
    });

    const verified = ['React', 'Node.js', 'TypeScript'];
    const payload = (service as any).buildPayload(s, metadata, verified);

    // No overlap → all preserved.
    expect(payload.verified_skills).toEqual(['React', 'Node.js', 'TypeScript']);
    expect(payload.recommended_upskilling.map((u: any) => u.skill)).toEqual(['Kubernetes']);
  });

  // ============================================================
  // Rule 2: roadmap must be sorted by week ascending
  // ============================================================
  it('sorts roadmap by week ascending (unsorted input)', () => {
    const s = session({
      roadmap: {
        items: [
          // Intentionally out of order.
          { week: 3, description: 'Learn C', resourceUrl: 'https://c.com/', skillGap: { skillName: 'C' } },
          { week: 1, description: 'Learn A', resourceUrl: 'https://a.com/', skillGap: { skillName: 'A' } },
          { week: 2, description: 'Learn B', resourceUrl: 'https://b.com/', skillGap: { skillName: 'B' } },
        ],
      },
    });

    const payload = (service as any).buildPayload(s, metadata, []);
    expect(payload.roadmap.map((r: any) => r.week)).toEqual([1, 2, 3]);
    expect(payload.roadmap.map((r: any) => r.skill)).toEqual(['A', 'B', 'C']);
  });

  it('keeps roadmap empty when no items', () => {
    const s = session({ roadmap: null });
    const payload = (service as any).buildPayload(s, metadata, []);
    expect(payload.roadmap).toEqual([]);
  });

  // ============================================================
  // Dimensions + overall score
  // ============================================================
  it('computes overall_score from the average dimension score', () => {
    const s = session({
      dimensions: [
        { dimensionType: 'TECHNICAL_DEPTH', score: 2, reason: 'r', evidenceQuote: { quote: 'q', timestamp: '00:01' }, skillGaps: [] },
        { dimensionType: 'COMMUNICATION', score: 3, reason: 'r', evidenceQuote: { quote: 'q', timestamp: '00:02' }, skillGaps: [] },
        { dimensionType: 'DOMAIN_EXPERIENCE', score: 4, reason: 'r', evidenceQuote: { quote: 'q', timestamp: '00:03' }, skillGaps: [] },
        { dimensionType: 'PROBLEM_SOLVING', score: 5, reason: 'r', evidenceQuote: { quote: 'q', timestamp: '00:04' }, skillGaps: [] },
      ],
    });

    const payload = (service as any).buildPayload(s, metadata, []);
    // avg = (2+3+4+5)/4 = 3.5 → *20 = 70
    expect(payload.overall_score).toBe(70);
    expect(payload.dimensions.map((d: any) => d.raw_score)).toEqual([2, 3, 4, 5]);
    expect(payload.dimensions.map((d: any) => d.score)).toEqual([40, 60, 80, 100]);
  });

  // ============================================================
  // Duplicate gap deduplication
  // ============================================================
  it('deduplicates recommended_upskilling by lowercase skill name', () => {
    const s = session({
      dimensions: [
        {
          dimensionType: 'TECHNICAL_DEPTH',
          score: 2,
          reason: 'r',
          evidenceQuote: { quote: 'q', timestamp: '00:01' },
          skillGaps: [
            { skillName: 'Docker', priority: 'MEDIUM' },
            { skillName: 'docker', priority: 'LOW' },     // dup, different case
            { skillName: 'Docker ', priority: 'HIGH' },  // dup, trailing space
          ],
        },
        { dimensionType: 'COMMUNICATION', score: 3, reason: 'r', evidenceQuote: { quote: 'q', timestamp: '00:02' }, skillGaps: [] },
        { dimensionType: 'DOMAIN_EXPERIENCE', score: 3, reason: 'r', evidenceQuote: { quote: 'q', timestamp: '00:03' }, skillGaps: [] },
        { dimensionType: 'PROBLEM_SOLVING', score: 3, reason: 'r', evidenceQuote: { quote: 'q', timestamp: '00:04' }, skillGaps: [] },
      ],
    });

    const payload = (service as any).buildPayload(s, metadata, []);
    expect(payload.recommended_upskilling).toHaveLength(1);
    // First occurrence wins (priority MEDIUM, original casing).
    expect(payload.recommended_upskilling[0]).toEqual({ skill: 'Docker', priority: 'MEDIUM' });
  });
});