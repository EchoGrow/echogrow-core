import { z } from 'zod';

// Interview status (matches Prisma enum)
export const InterviewStatusSchema = z.enum([
  'QUEUED',
  'PROCESSING',
  'SCORED',
  'FLAGGED',
  'NEEDS_REVIEW',
  'COMPLETED',
  'FAILED',
  'REJECTED',
]);

export type InterviewStatus = z.infer<typeof InterviewStatusSchema>;

// Single Upload
export const CreateInterviewSchema = z.object({
  candidateName: z.string().min(2, 'Name must be at least 2 characters'),
  candidateEmail: z.string().email('Invalid email address'),
  transcript: z.string().min(40, 'Transcript must be at least 40 characters'),
  cv: z.string().min(20, 'CV must be at least 20 characters'),
});

export type CreateInterviewDto = z.infer<typeof CreateInterviewSchema>;

// Bulk Upload
export const BulkUploadCandidateSchema = z.object({
  candidateName: z.string().min(2, 'Name must be at least 2 characters'),
  candidateEmail: z.string().email('Invalid email address'),
  transcriptFileName: z.string().min(1, 'transcriptFileName is required'),
  resumeFileName: z.string().min(1, 'resumeFileName is required'),
});

export type BulkUploadCandidate = z.infer<typeof BulkUploadCandidateSchema>;

export const BulkUploadMetadataSchema = z
  .array(BulkUploadCandidateSchema)
  .min(1, 'At least one candidate is required')
  .max(50, 'Maximum 50 candidates per request');

export type BulkUploadMetadata = z.infer<typeof BulkUploadMetadataSchema>;

export const BulkUploadResultSchema = z.object({
  candidateName: z.string(),
  candidateEmail: z.string(),
  status: z.enum(['queued', 'error']),
  interviewId: z.string().optional(),
  error: z.string().optional(),
});

export type BulkUploadResult = z.infer<typeof BulkUploadResultSchema>;

export const RejectedFileSchema = z.object({
  filename: z.string(),
  reason: z.string(),
  sizeBytes: z.number().int().min(0),
});

export type RejectedFile = z.infer<typeof RejectedFileSchema>;

export const BulkUploadResponseSchema = z.object({
  results: z.array(BulkUploadResultSchema),
  rejectedFiles: z.array(RejectedFileSchema).default([]),
  summary: z.object({
    total: z.number().int().min(0),
    queued: z.number().int().min(0),
    failed: z.number().int().min(0),
    rejectedFilesCount: z.number().int().min(0),
  }),
});

export type BulkUploadResponse = z.infer<typeof BulkUploadResponseSchema>;