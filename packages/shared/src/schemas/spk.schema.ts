import { z } from 'zod';

// SPK Dimension
export const SpkDimensionSchema = z.object({
  name: z.string().min(1),
  score: z.number().int().min(0).max(100),      // 0-100
  raw_score: z.number().int().min(1).max(5),    // 1-5 (original)
  reason: z.string().optional(),
  evidence_quote: z.string().optional(),
  evidence_timestamp: z.string().optional(),
});

// SPK Discrepancy (embedded in payload)
export const SpkDiscrepancySchema = z.object({
  field: z.string().min(1),
  cv_says: z.string(),
  interview_says: z.string(),
  status: z.enum(['pending', 'confirmed', 'dismissed']),
  confidence: z.number().min(0).max(1),
  reviewer_notes: z.string().nullable().optional(),
});

// SPK Skill Gap
export const SpkSkillGapSchema = z.object({
  skill: z.string().min(1),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']),
});

// SPK Roadmap Item
export const SpkRoadmapItemSchema = z.object({
  week: z.number().int().min(1),
  skill: z.string().min(1),
  task: z.string().min(1),
  resource_url: z.string().url().optional().nullable(),
});

// Full SPK Payload (stored in SpkProfile.spkPayload)
export const SpkPayloadSchema = z.object({
  // 1. Identity
  candidate_id: z.string().min(1),
  candidate_name: z.string().min(1),

  // 2. Overall fit
  overall_score: z.number().int().min(0).max(100),
  confidence: z.number().min(0).max(1),

  // 3. Dimensions (with evidence)
  dimensions: z.array(SpkDimensionSchema).length(4),

  // 4. Verified Skills (skills the candidate PROVED in the interview)
  verified_skills: z.array(z.string()),

  // 5. Skill gaps + roadmap
  recommended_upskilling: z.array(SpkSkillGapSchema),
  roadmap: z.array(SpkRoadmapItemSchema),

  // 6. Discrepancies + human review
  discrepancies: z.array(SpkDiscrepancySchema),
  discrepancies_count: z.number().int().min(0),
  human_review_status: z.enum(['approved', 'pending', 'rejected']),

  // 7. Metadata (LLM-extracted)
  seniority: z.string().nullable(),
  primary_role: z.string().nullable(),
  timezone: z.string().nullable(),
  languages: z.array(z.string()).nullable(),
  years_of_experience: z.number().nullable(),

  // 8. Document metadata
  generated_at: z.string(),       // ISO 8601
  schema_version: z.string(),     // "1.0.0"
});

export type SpkPayload = z.infer<typeof SpkPayloadSchema>;
export type SpkDimension = z.infer<typeof SpkDimensionSchema>;
export type SpkDiscrepancy = z.infer<typeof SpkDiscrepancySchema>;
export type SpkSkillGap = z.infer<typeof SpkSkillGapSchema>;
export type SpkRoadmapItem = z.infer<typeof SpkRoadmapItemSchema>;

// SPK Export Response (what the API returns)
export const SpkExportResponseSchema = SpkPayloadSchema;
export type SpkExportResponse = SpkPayload;