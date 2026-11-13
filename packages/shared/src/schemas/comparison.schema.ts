import { z } from 'zod'

// ============================================================
// Input
// ============================================================

export const CompareRequestSchema = z.object({
  interviewIds: z.array(z.string().min(1)).min(2, 'At least 2 candidates are required').max(10, 'Maximum 10 candidates'),
  targetRole: z.string().min(1).optional(),
})

export type CompareRequest = z.infer<typeof CompareRequestSchema>

// ============================================================
// Output
// ============================================================

export const RankedCandidateSchema = z.object({
  interviewId: z.string().min(1),
  candidateName: z.string().min(1),
  rank: z.number().int().min(1),
  reason: z.string().min(1),
  fitScore: z.number().min(0).max(100).optional(), // 0-100, only if targetRole provided
})

export const DimensionWinnerSchema = z.object({
  dimension: z.enum([
    'Technical Depth',
    'Communication Clarity',
    'Domain Experience',
    'Problem Solving',
  ]),
  winnerInterviewId: z.string().min(1),
  winnerName: z.string().min(1),
  reason: z.string().min(1),
})

export const CandidatePointsSchema = z.object({
  interviewId: z.string().min(1),
  candidateName: z.string().min(1),
  points: z.array(z.string().min(1)).min(1),
})

export const ComparisonResultSchema = z.object({
  summary: z.string().min(1),
  targetRole: z.string().nullable(),
  ranking: z.array(RankedCandidateSchema).min(2),
  perDimensionWinners: z.array(DimensionWinnerSchema).length(4),
  strengths: z.array(CandidatePointsSchema).min(1),
  concerns: z.array(CandidatePointsSchema).min(1),
  recommendation: z.string().min(1),
  confidence: z.number().min(0).max(1),
})

export type ComparisonResult = z.infer<typeof ComparisonResultSchema>
export type RankedCandidate = z.infer<typeof RankedCandidateSchema>
export type DimensionWinner = z.infer<typeof DimensionWinnerSchema>
export type CandidatePoints = z.infer<typeof CandidatePointsSchema>

// ============================================================
// Persistence (for caching)
// ============================================================

export const ComparisonRecordSchema = ComparisonResultSchema.extend({
  id: z.string().min(1),
  createdAt: z.string(),
})

export type ComparisonRecord = z.infer<typeof ComparisonRecordSchema>

// ============================================================
// List for the selection page
// ============================================================

export const InterviewListItemSchema = z.object({
  id: z.string().min(1),
  candidateName: z.string().min(1),
  candidateEmail: z.string(),
  completedAt: z.string().nullable(),
  overallScore: z.number().nullable(),
  pendingDiscrepancies: z.number().int().min(0),
  totalDiscrepancies: z.number().int().min(0),
  skillGaps: z.number().int().min(0),
})

export type InterviewListItem = z.infer<typeof InterviewListItemSchema>

export const InterviewListResponseSchema = z.object({
  interviews: z.array(InterviewListItemSchema),
  total: z.number().int().min(0),
})

export type InterviewListResponse = z.infer<typeof InterviewListResponseSchema>