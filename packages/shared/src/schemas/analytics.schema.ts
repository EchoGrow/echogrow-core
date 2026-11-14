import { z } from 'zod'

// ============================================================
// KPI Types
// ============================================================

export const AnalyticsKpisSchema = z.object({
  totalInterviews: z.number().int().min(0),
  completedInterviews: z.number().int().min(0),
  failedInterviews: z.number().int().min(0),
  needsReviewInterviews: z.number().int().min(0),
  rejectedInterviews: z.number().int().min(0),
  completionRate: z.number().min(0).max(100),

  // manual/saved averages from the pipeline
  avgProcessingTimeSeconds: z.number().min(0),
  avgManualReviewSeconds: z.number().min(0),
  avgSavedSeconds: z.number().min(0),

  // Retry tracking
  retriedInterviews: z.number().int().min(0),
  avgProcessingAttempts: z.number().min(0),

  avgDiscrepanciesPerInterview: z.number().min(0),
  avgSkillGapsPerInterview: z.number().min(0),
  avgOverallScore: z.number().min(0).max(5),
})

export type AnalyticsKpis = z.infer<typeof AnalyticsKpisSchema>

// ============================================================
// Chart Types
// ============================================================

export const SkillCountSchema = z.object({
  skill: z.string(),
  count: z.number().int().min(0),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
})

export const InterviewsPerDaySchema = z.object({
  date: z.string(),
  count: z.number().int().min(0),
  completed: z.number().int().min(0).optional(),
  failed: z.number().int().min(0).optional(),
})

export const DimensionAveragesSchema = z.object({
  technicalDepth: z.number().min(0).max(5),
  communication: z.number().min(0).max(5),
  domainExperience: z.number().min(0).max(5),
  problemSolving: z.number().min(0).max(5),
})

export const DiscrepancyClaimCountSchema = z.object({
  claim: z.string(),
  count: z.number().int().min(0),
  highSeverityCount: z.number().int().min(0),
  mediumSeverityCount: z.number().int().min(0),
  lowSeverityCount: z.number().int().min(0),
})

export const RecentInterviewSchema = z.object({
  id: z.string(),
  candidateName: z.string(),
  candidateEmail: z.string(),
  status: z.enum([
    'QUEUED',
    'PROCESSING',
    'SCORED',
    'FLAGGED',
    'NEEDS_REVIEW',
    'COMPLETED',
    'FAILED',
    'REJECTED',
  ]),
  overallScore: z.number().nullable(),
  pendingDiscrepancies: z.number().int().min(0),
  completedAt: z.string().nullable(),
  createdAt: z.string(),
  // processing attempts (1 = normal, 2+ = retried)
  processingAttempts: z.number().int().min(0),
})

export type SkillCount = z.infer<typeof SkillCountSchema>
export type InterviewsPerDay = z.infer<typeof InterviewsPerDaySchema>
export type DimensionAverages = z.infer<typeof DimensionAveragesSchema>
export type DiscrepancyClaimCount = z.infer<typeof DiscrepancyClaimCountSchema>
export type RecentInterview = z.infer<typeof RecentInterviewSchema>

// ============================================================
// Full Analytics Summary
// ============================================================

export const AnalyticsSummarySchema = z.object({
  generatedAt: z.string(),
  range: z.string(),
  kpis: AnalyticsKpisSchema,
  charts: z.object({
    topMissingSkills: z.array(SkillCountSchema),
    interviewsPerDay: z.array(InterviewsPerDaySchema),
    dimensionAverages: DimensionAveragesSchema,
    topDiscrepancyClaims: z.array(DiscrepancyClaimCountSchema),
  }),
  tables: z.object({
    recentInterviews: z.array(RecentInterviewSchema),
  }),
})

export type AnalyticsSummary = z.infer<typeof AnalyticsSummarySchema>

// ============================================================
// Request Query Schema
// ============================================================

export const AnalyticsRangeSchema = z.enum(['7d', '30d', '90d', 'all'])
export type AnalyticsRange = z.infer<typeof AnalyticsRangeSchema>

export const AnalyticsQuerySchema = z.object({
  range: AnalyticsRangeSchema.optional().default('30d'),
})
export type AnalyticsQuery = z.infer<typeof AnalyticsQuerySchema>

// ============================================================
// Detail Endpoint (for Modals)
// ============================================================

export const AnalyticsDetailTypeSchema = z.enum([
  'interviews',
  'completion-breakdown',
  'processing-times',
  'discrepancies',
  'scores',
  'skills',
  'needs-review',
])
export type AnalyticsDetailType = z.infer<typeof AnalyticsDetailTypeSchema>

export const AnalyticsDetailQuerySchema = z.object({
  type: AnalyticsDetailTypeSchema,
  range: AnalyticsRangeSchema.optional().default('30d'),
  status: z.string().optional(),
})
export type AnalyticsDetailQuery = z.infer<typeof AnalyticsDetailQuerySchema>

// --- Interviews detail (Modal 1) ---
export const InterviewDetailItemSchema = z.object({
  id: z.string(),
  candidateName: z.string(),
  candidateEmail: z.string(),
  status: z.string(),
  overallScore: z.number().nullable(),
  pendingDiscrepancies: z.number().int().min(0),
  totalDiscrepancies: z.number().int().min(0),
  skillGaps: z.number().int().min(0),
  createdAt: z.string(),
  completedAt: z.string().nullable(),
  processingAttempts: z.number().int().min(0),
})
export type InterviewDetailItem = z.infer<typeof InterviewDetailItemSchema>

export const InterviewsDetailResponseSchema = z.object({
  items: z.array(InterviewDetailItemSchema),
  total: z.number().int().min(0),
})
export type InterviewsDetailResponse = z.infer<typeof InterviewsDetailResponseSchema>

// --- Completion breakdown (Modal 2) ---
export const CompletionBreakdownItemSchema = z.object({
  status: z.string(),
  count: z.number().int().min(0),
  percentage: z.number().min(0).max(100),
})
export type CompletionBreakdownItem = z.infer<typeof CompletionBreakdownItemSchema>

export const CompletionBreakdownResponseSchema = z.object({
  total: z.number().int().min(0),
  items: z.array(CompletionBreakdownItemSchema),
  formula: z.string(),
})
export type CompletionBreakdownResponse = z.infer<typeof CompletionBreakdownResponseSchema>

// --- Processing times (Modal 3) ---
export const ProcessingTimeItemSchema = z.object({
  interviewId: z.string(),
  candidateName: z.string(),
  candidateEmail: z.string(),
  processingSeconds: z.number().min(0),
  manualReviewSeconds: z.number().min(0),
  savedSeconds: z.number(),
  savingsPercent: z.number(),
  completedAt: z.string().nullable(),
  processingAttempts: z.number().int().min(0),
})
export type ProcessingTimeItem = z.infer<typeof ProcessingTimeItemSchema>

export const ProcessingTimesResponseSchema = z.object({
  items: z.array(ProcessingTimeItemSchema),
  avgProcessingSeconds: z.number().min(0),
  avgManualSeconds: z.number().min(0),
  totalSavedSeconds: z.number(),
})
export type ProcessingTimesResponse = z.infer<typeof ProcessingTimesResponseSchema>

// --- Discrepancies detail (Modal 4) ---
export const DiscrepancyDetailItemSchema = z.object({
  interviewId: z.string(),
  candidateName: z.string(),
  candidateEmail: z.string(),
  total: z.number().int().min(0),
  pending: z.number().int().min(0),
  confirmed: z.number().int().min(0),
  dismissed: z.number().int().min(0),
  high: z.number().int().min(0),
  medium: z.number().int().min(0),
  low: z.number().int().min(0),
})
export type DiscrepancyDetailItem = z.infer<typeof DiscrepancyDetailItemSchema>

export const DiscrepanciesDetailResponseSchema = z.object({
  items: z.array(DiscrepancyDetailItemSchema),
  totalDiscrepancies: z.number().int().min(0),
  totalPending: z.number().int().min(0),
  totalConfirmed: z.number().int().min(0),
  totalDismissed: z.number().int().min(0),
})
export type DiscrepanciesDetailResponse = z.infer<typeof DiscrepanciesDetailResponseSchema>

// --- Scores detail (Modal 5) ---
export const ScoreDetailItemSchema = z.object({
  interviewId: z.string(),
  candidateName: z.string(),
  overallScore: z.number().nullable(),
  technicalDepth: z.number().nullable(),
  communication: z.number().nullable(),
  domainExperience: z.number().nullable(),
  problemSolving: z.number().nullable(),
  confidence: z.number().nullable(),
})
export type ScoreDetailItem = z.infer<typeof ScoreDetailItemSchema>

export const ScoreDistributionSchema = z.object({
  score: z.number().int(),
  count: z.number().int().min(0),
})
export type ScoreDistribution = z.infer<typeof ScoreDistributionSchema>

export const ScoresDetailResponseSchema = z.object({
  items: z.array(ScoreDetailItemSchema),
  distribution: z.array(ScoreDistributionSchema),
  avgScore: z.number().min(0).max(5),
})
export type ScoresDetailResponse = z.infer<typeof ScoresDetailResponseSchema>

// --- Skills detail (Modal 6) ---
export const SkillDetailItemSchema = z.object({
  interviewId: z.string(),
  candidateName: z.string(),
  skillNames: z.array(z.string()),
  count: z.number().int().min(0),
})
export type SkillDetailItem = z.infer<typeof SkillDetailItemSchema>

export const SkillsDetailResponseSchema = z.object({
  items: z.array(SkillDetailItemSchema),
  topSkills: z.array(SkillCountSchema),
})
export type SkillsDetailResponse = z.infer<typeof SkillsDetailResponseSchema>

// --- Needs review (Modal 7) ---
export const NeedsReviewItemSchema = z.object({
  id: z.string(),
  candidateName: z.string(),
  candidateEmail: z.string(),
  confidence: z.number().nullable(),
  transcriptWords: z.number().int().min(0),
  createdAt: z.string(),
})
export type NeedsReviewItem = z.infer<typeof NeedsReviewItemSchema>

export const NeedsReviewResponseSchema = z.object({
  items: z.array(NeedsReviewItemSchema),
})
export type NeedsReviewResponse = z.infer<typeof NeedsReviewResponseSchema>

// ============================================================
// Unified Detail Response
// ============================================================

export const AnalyticsDetailResponseSchema = z.union([
  InterviewsDetailResponseSchema,
  CompletionBreakdownResponseSchema,
  ProcessingTimesResponseSchema,
  DiscrepanciesDetailResponseSchema,
  ScoresDetailResponseSchema,
  SkillsDetailResponseSchema,
  NeedsReviewResponseSchema,
])
export type AnalyticsDetailResponse = z.infer<typeof AnalyticsDetailResponseSchema>