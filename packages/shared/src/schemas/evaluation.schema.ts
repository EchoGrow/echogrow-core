import { z } from 'zod';

export const DimensionSchema = z.object({
  name: z.enum([
    'Technical Depth',
    'Communication Clarity',
    'Domain Experience',
    'Problem Solving',
  ]),
  score: z.number().int().min(1).max(5),
  reason: z.string().min(1),
  evidenceQuote: z.string().min(1),
  timestamp: z.string().optional(),
});

export const EvaluationSchema = z.object({
  dimensions: z.array(DimensionSchema).length(4),
  overallConfidence: z.number().min(0).max(1),
});

export const ScorecardSchema = z.union([
  z.object({
    status: z.literal('scored'),
    interviewId: z.string().min(1),
    candidateName: z.string().min(1),
    interviewDate: z.string(),
    dimensions: z.array(DimensionSchema),
    overallConfidence: z.number().min(0).max(1),
    pendingDiscrepancies: z.number().int().min(0),
    skillGaps: z.number().int().min(0),
  }),
  z.object({
    status: z.literal('needs_review'),
    interviewId: z.string().min(1),
    candidateName: z.string().min(1),
    transcript: z.string(),
    resume: z.string(),
    structuredTranscript: z.any().optional(),
    confidence: z.number().min(0).max(1),
    message: z.string(),
  }),
  z.object({
    status: z.literal('rejected'),
    interviewId: z.string().min(1),
    candidateName: z.string().min(1),
    message: z.string(),
  }),
]);

export type Dimension = z.infer<typeof DimensionSchema>;
export type Evaluation = z.infer<typeof EvaluationSchema>;
export type Scorecard = z.infer<typeof ScorecardSchema>;