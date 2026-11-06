import { z } from 'zod';

export const SkillGapSchema = z.object({
  skillName: z.string().min(1),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']),
});

export const RoadmapItemSchema = z.object({
  week: z.number().int().min(1),
  task: z.string().min(1),
  resourceUrl: z.string().url().nullable(),
  skillName: z.string().min(1),
});

export const RoadmapSchema = z.object({
  gaps: z.array(SkillGapSchema),
  roadmap: z.array(RoadmapItemSchema),
});

export type SkillGap = z.infer<typeof SkillGapSchema>;
export type RoadmapItem = z.infer<typeof RoadmapItemSchema>;
export type Roadmap = z.infer<typeof RoadmapSchema>;