import { z } from 'zod';

export const RoadmapItemGenerationSchema = z.object({
  week: z.number().int().min(1),
  task: z.string().min(1),
  resourceUrl: z.string().url(),
  skillName: z.string().min(1),
});

export const RoadmapGenerationSchema = z.object({
  gaps: z.array(z.string().min(1)),
  roadmap: z.array(RoadmapItemGenerationSchema).min(1),
});

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

export const RoadmapResponseSchema = z.object({
  gaps: z.array(SkillGapSchema),
  roadmap: z.array(RoadmapItemSchema),
});

// Types
export type RoadmapItemGeneration = z.infer<typeof RoadmapItemGenerationSchema>;
export type RoadmapGeneration = z.infer<typeof RoadmapGenerationSchema>;
export type SkillGap = z.infer<typeof SkillGapSchema>;
export type RoadmapItem = z.infer<typeof RoadmapItemSchema>;
export type RoadmapResponse = z.infer<typeof RoadmapResponseSchema>;

// Backward compatibility aliases
export const RoadmapSchema = RoadmapGenerationSchema;
export type Roadmap = RoadmapGeneration;