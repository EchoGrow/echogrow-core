import { z } from 'zod';

export const DiscrepancyItemSchema = z.object({
  field: z.string(),
  cvSays: z.string(),
  interviewSays: z.string(),
  cvQuote: z.string(),
  interviewQuote: z.string(),
  confidence: z.number().min(0).max(1),
  action: z.literal('flag_for_human_review'),
});

export const DiscrepancyResponseSchema = z.object({
  discrepancies: z.array(DiscrepancyItemSchema),
});

export const DiscrepancySchema = z.object({
  discrepancies: z.array(DiscrepancyItemSchema),
});

export const DiscrepancyStatusUpdateSchema = z.object({
  status: z.enum(['confirmed', 'dismissed']),
});

export type DiscrepancyItem = z.infer<typeof DiscrepancyItemSchema>;
export type DiscrepancyResponse = z.infer<typeof DiscrepancyResponseSchema>;
export type DiscrepancyStatusUpdate = z.infer<typeof DiscrepancyStatusUpdateSchema>;