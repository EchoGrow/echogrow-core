import { z } from 'zod';

export const SpeakerTurnSchema = z.object({
  speaker: z.enum(['Interviewer', 'Candidate']).or(z.string().min(1)),
  text: z.string().min(1),
  timestamp: z.string().optional(),
});

export type SpeakerTurn = z.infer<typeof SpeakerTurnSchema>;

export const EvaluationJobDataSchema = z.object({
  interviewSessionId: z.string().min(1),
  candidateId: z.string().optional(),
  transcript: z.string().optional(),
  cv: z.string().optional(),
});

export type EvaluationJobData = z.infer<typeof EvaluationJobDataSchema>;

export const EvaluationJobResultSchema = z.object({
  success: z.boolean(),
  interviewSessionId: z.string(),
  scorecardId: z.string().optional(),
  dimensionsCount: z.number().optional(),
  overallConfidence: z.number().optional(),
  error: z.string().optional(),
});

export type EvaluationJobResult = z.infer<typeof EvaluationJobResultSchema>;

