import { z } from 'zod';

export const RoadmapItemSchema = z.object({
  week: z.number().int().min(1).max(3),
  task: z.string().min(1),
  resourceUrl: z.string().url(),
  skillName: z.string().min(1),
});

export const RoadmapSchema = z.object({
  gaps: z.array(z.string().min(1)),
  roadmap: z.array(RoadmapItemSchema).min(3),
});

export type RoadmapItem = z.infer<typeof RoadmapItemSchema>;
export type Roadmap = z.infer<typeof RoadmapSchema>;