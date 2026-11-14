import { z } from 'zod';

export const DiscrepancySeveritySchema = z.enum([
  'low',
  'medium',
  'high',
]);

export const DiscrepancyItemSchema = z.object({
  field: z.string(),
  cvSays: z.string(),
  interviewSays: z.string(),
  cvQuote: z.string(),
  interviewQuote: z.string(),
  confidence: z.number().min(0).max(1),
  severity: DiscrepancySeveritySchema,
  action: z.literal('flag_for_human_review'),
});

export const DiscrepancyRecordSchema = DiscrepancyItemSchema.extend({
  id: z.string().min(1),
  status: z.enum(['pending', 'confirmed', 'dismissed']),
  reviewerNotes: z.string().max(1000).nullable(),
});

export const DiscrepancyResponseSchema = z.object({
  discrepancies: z.array(DiscrepancyItemSchema),
});

export const DiscrepancySchema = z.object({
  discrepancies: z.array(DiscrepancyRecordSchema),
});

export const DiscrepancyStatusUpdateSchema = z.object({
  reviewerNotes: z.string().max(1000).optional(),
  status: z.enum(['confirmed', 'dismissed']),
});

export const DiscrepancyStatusResponseSchema = z.object({
  id: z.string(),
  status: z.enum(['CONFIRMED', 'DISMISSED']),
  reviewedAt: z.date(),
  reviewerNotes: z.string().max(1000).nullable(),
});

export type DiscrepancyItem = z.infer<typeof DiscrepancyItemSchema>;
export type DiscrepancyRecord = z.infer<typeof DiscrepancyRecordSchema>;
export type Discrepancy = z.infer<typeof DiscrepancySchema>;
export type DiscrepancyStatusUpdate = z.infer<typeof DiscrepancyStatusUpdateSchema>;
export type DiscrepancyStatusResponse = z.infer<typeof DiscrepancyStatusResponseSchema>;
export type DiscrepancySeverity = z.infer<typeof DiscrepancySeveritySchema>;