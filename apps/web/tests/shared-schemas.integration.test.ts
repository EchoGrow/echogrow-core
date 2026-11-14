import { describe, it, expect } from 'vitest';
import {
  EvaluationSchema,
  DiscrepancySchema,
  RoadmapSchema,
  ScorecardSchema,
} from '@echogrow/shared';

describe('Shared Schemas Integration (Web)', () => {
  it('imports EvaluationSchema successfully', () => {
    expect(EvaluationSchema).toBeDefined();
  });

  it('imports DiscrepancySchema successfully', () => {
    expect(DiscrepancySchema).toBeDefined();
  });

  it('imports RoadmapSchema successfully', () => {
    expect(RoadmapSchema).toBeDefined();
  });

  it('validates correct evaluation data', () => {
    const data = {
      dimensions: [
        { name: 'Technical Depth', score: 4, reason: 'Good', evidenceQuote: 'Quote 1' },
        { name: 'Communication Clarity', score: 3, reason: 'Clear', evidenceQuote: 'Quote 2' },
        { name: 'Domain Experience', score: 2, reason: 'Limited', evidenceQuote: 'Quote 3' },
        { name: 'Problem Solving', score: 4, reason: 'Structured', evidenceQuote: 'Quote 4' },
      ],
      overallConfidence: 0.85,
    };
    expect(() => EvaluationSchema.parse(data)).not.toThrow();
  });

  describe('ScorecardSchema (scored)', () => {
    const baseScored = {
      status: 'scored',
      interviewId: 'interview-1',
      candidateName: 'Scored User',
      interviewDate: '2026-11-14T10:00:00.000Z',
      dimensions: [
        { name: 'Technical Depth', score: 4, reason: 'Good', evidenceQuote: 'Quote 1' },
        { name: 'Communication Clarity', score: 3, reason: 'Clear', evidenceQuote: 'Quote 2' },
        { name: 'Domain Experience', score: 2, reason: 'Limited', evidenceQuote: 'Quote 3' },
        { name: 'Problem Solving', score: 4, reason: 'Structured', evidenceQuote: 'Quote 4' },
      ],
      overallConfidence: 0.85,
      pendingDiscrepancies: 0,
      totalDiscrepancies: 0,
      skillGaps: 0,
      spkStatus: 'ready',
      spkError: null,
    };

    it('accepts structuredTranscript speaker turns', () => {
      const parsed = ScorecardSchema.parse({
        ...baseScored,
        structuredTranscript: [
          { speaker: 'Interviewer', text: 'Describe a hard bug.', timestamp: '00:00:01' },
          { speaker: 'Candidate', text: 'I traced a memory leak.' },
        ],
      });

      expect(parsed.status).toBe('scored');
      if (parsed.status === 'scored') {
        expect(parsed.structuredTranscript).toHaveLength(2);
        expect(parsed.structuredTranscript?.[1].speaker).toBe('Candidate');
      }
    });

    it('accepts a missing or null structuredTranscript', () => {
      expect(ScorecardSchema.parse(baseScored).status).toBe('scored');
      expect(
        ScorecardSchema.parse({ ...baseScored, structuredTranscript: null }).status,
      ).toBe('scored');
    });

    it('falls back to null for malformed legacy structuredTranscript data', () => {
      const parsed = ScorecardSchema.parse({
        ...baseScored,
        structuredTranscript: 'not-an-array',
      });

      expect(parsed.status).toBe('scored');
      if (parsed.status === 'scored') {
        expect(parsed.structuredTranscript).toBeNull();
      }
    });
  });
});