import { describe, it, expect } from 'vitest';
import { EvaluationSchema, DiscrepancySchema, RoadmapSchema } from '@echogrow/shared';

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
});