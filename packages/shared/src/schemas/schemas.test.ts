import { describe, it, expect } from 'vitest';
import { EvaluationSchema } from './evaluation.schema';
import { DiscrepancySchema, DiscrepancyStatusUpdateSchema } from './discrepancy.schema';
import { RoadmapSchema } from './roadmap.schema';

describe('EvaluationSchema', () => {
  const validEvaluation = {
    dimensions: [
      { name: 'Technical Depth', score: 4, reason: 'Good', evidenceQuote: 'I indexed...' },
      { name: 'Communication Clarity', score: 3, reason: 'Clear', evidenceQuote: 'I explained...' },
      { name: 'Domain Experience', score: 2, reason: 'Limited', evidenceQuote: 'I worked on...' },
      { name: 'Problem Solving', score: 4, reason: 'Structured', evidenceQuote: 'I broke it down...' },
    ],
    overallConfidence: 0.85,
  };

  it('accepts valid evaluation data', () => {
    expect(() => EvaluationSchema.parse(validEvaluation)).not.toThrow();
  });

  it('rejects evaluation with fewer than 4 dimensions', () => {
    const invalid = { ...validEvaluation, dimensions: validEvaluation.dimensions.slice(0, 3) };
    expect(() => EvaluationSchema.parse(invalid)).toThrow();
  });

  it('rejects score outside 1-5 range', () => {
    const invalid = {
      ...validEvaluation,
      dimensions: validEvaluation.dimensions.map((d, i) =>
        i === 0 ? { ...d, score: 6 } : d,
      ),
    };
    expect(() => EvaluationSchema.parse(invalid)).toThrow();
  });

  it('rejects missing evidenceQuote', () => {
    const invalid = {
      ...validEvaluation,
      dimensions: validEvaluation.dimensions.map((d, i) =>
        i === 0 ? { ...d, evidenceQuote: '' } : d,
      ),
    };
    expect(() => EvaluationSchema.parse(invalid)).toThrow();
  });
});

describe('DiscrepancySchema', () => {
  const validDiscrepancy = {
    discrepancies: [
      {
        field: 'team_lead',
        cvSays: 'Individual Contributor',
        interviewSays: 'I led a team of six',
        cvQuote: 'Individual Contributor',
        interviewQuote: 'I led a team of six',
        confidence: 0.91,
        action: 'flag_for_human_review',
      },
    ],
  };

  it('accepts valid discrepancy data', () => {
    expect(() => DiscrepancySchema.parse(validDiscrepancy)).not.toThrow();
  });

  it('accepts empty discrepancies array', () => {
    expect(() => DiscrepancySchema.parse({ discrepancies: [] })).not.toThrow();
  });

  it('rejects invalid action value', () => {
    const invalid = {
      discrepancies: [{ ...validDiscrepancy.discrepancies[0], action: 'auto_reject' }],
    };
    expect(() => DiscrepancySchema.parse(invalid)).toThrow();
  });

  it('rejects confidence outside 0-1', () => {
    const invalid = {
      discrepancies: [{ ...validDiscrepancy.discrepancies[0], confidence: 1.5 }],
    };
    expect(() => DiscrepancySchema.parse(invalid)).toThrow();
  });
});

describe('DiscrepancyStatusUpdateSchema', () => {
  it('accepts confirmed status', () => {
    expect(() => DiscrepancyStatusUpdateSchema.parse({ status: 'confirmed' })).not.toThrow();
  });

  it('accepts dismissed status', () => {
    expect(() => DiscrepancyStatusUpdateSchema.parse({ status: 'dismissed' })).not.toThrow();
  });

  it('rejects invalid status', () => {
    expect(() => DiscrepancyStatusUpdateSchema.parse({ status: 'pending' })).toThrow();
  });
});

describe('RoadmapSchema', () => {
  const validRoadmap = {
    gaps: ['SQL Indexing'],
    roadmap: [
      { week: 1, task: 'Learn B-Trees', resourceUrl: 'https://example.com/btrees', skillName: 'SQL Indexing' },
      { week: 2, task: 'Practice indexing', resourceUrl: 'https://example.com/practice', skillName: 'SQL Indexing' },
      { week: 3, task: 'Build a project', resourceUrl: 'https://example.com/project', skillName: 'SQL Indexing' },
    ],
  };

  it('accepts valid roadmap data', () => {
    expect(() => RoadmapSchema.parse(validRoadmap)).not.toThrow();
  });

  it('rejects roadmap with fewer than 3 items', () => {
    const invalid = { ...validRoadmap, roadmap: validRoadmap.roadmap.slice(0, 2) };
    expect(() => RoadmapSchema.parse(invalid)).toThrow();
  });

  it('rejects invalid URL', () => {
    const invalid = {
      ...validRoadmap,
      roadmap: [{ ...validRoadmap.roadmap[0], resourceUrl: 'not-a-url' }],
    };
    expect(() => RoadmapSchema.parse(invalid)).toThrow();
  });

  it('rejects week outside 1-3', () => {
    const invalid = {
      ...validRoadmap,
      roadmap: [{ ...validRoadmap.roadmap[0], week: 4 }],
    };
    expect(() => RoadmapSchema.parse(invalid)).toThrow();
  });
});