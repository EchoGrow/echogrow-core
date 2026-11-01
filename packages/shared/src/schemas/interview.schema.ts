import { z } from 'zod';

export const CreateInterviewSchema = z.object({
  candidateName: z.string().min(2, 'Name must be at least 2 characters'),
  candidateEmail: z.string().email('Invalid email address'),
  transcript: z.string().min(40, 'Transcript must be at least 40 characters'),
  cv: z.string().min(20, 'CV must be at least 20 characters'),
});

export type CreateInterviewDto = z.infer<typeof CreateInterviewSchema>;