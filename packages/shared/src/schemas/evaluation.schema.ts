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

export type Dimension = z.infer<typeof DimensionSchema>;
export type Evaluation = z.infer<typeof EvaluationSchema>;