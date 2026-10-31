import { z } from 'zod';

export const DiscrepancyItemSchema = z.object({
  field: z.string().min(1),
  cvSays: z.string().min(1),
  interviewSays: z.string().min(1),
  cvQuote: z.string().optional(),
  interviewQuote: z.string().optional(),
  confidence: z.number().min(0).max(1),
  action: z.enum(['flag_for_human_review']),
});

export const DiscrepancySchema = z.object({
  discrepancies: z.array(DiscrepancyItemSchema),
});

export const DiscrepancyStatusUpdateSchema = z.object({
  status: z.enum(['confirmed', 'dismissed']),
  reviewedBy: z.string().optional(),
});

export type DiscrepancyItem = z.infer<typeof DiscrepancyItemSchema>;
export type Discrepancy = z.infer<typeof DiscrepancySchema>;
export type DiscrepancyStatusUpdate = z.infer<typeof DiscrepancyStatusUpdateSchema>;