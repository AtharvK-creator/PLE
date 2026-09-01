import { z } from 'zod';

export const generateRoadmapSchema = z.object({
  goal: z.string().min(1, 'Goal is required').max(200),
  branch: z.string().min(1, 'Branch is required').max(200),
  semester: z.number().int().min(1).max(8),
  currentSkillLevel: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).optional(),
});

export type GenerateRoadmapInput = z.infer<typeof generateRoadmapSchema>;
