import { z } from 'zod';

export const SpkExportSchema = z.object({
  candidate_id: z.string().min(1),
  candidate_name: z.string().min(1),
  verified_skills: z.array(z.string().min(1)),
  dimensions: z
    .array(
      z.object({
        name: z.enum([
          'Technical Depth',
          'Communication Clarity',
          'Domain Experience',
          'Problem Solving',
        ]),
        score: z.number().int().min(1).max(5),
      }),
    )
    .length(4),
  discrepancies_flagged: z.number().int().min(0),
  recommended_upskilling: z.array(z.string().min(1)),
  human_review_status: z.enum(['approved', 'pending_review']),
});

export type SpkExport = z.infer<typeof SpkExportSchema>;
