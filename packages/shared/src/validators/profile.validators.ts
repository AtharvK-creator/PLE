import { z } from 'zod';

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  branch: z.string().min(1).max(200).optional(),
  semester: z.number().int().min(1).max(8).optional(),
  skillLevel: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).optional(),
  careerGoal: z.string().min(1).max(200).optional(),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().url().or(z.literal('')).optional(),
  knowledgeDomains: z.array(z.string()).optional(),
  domainSkillLevels: z.record(z.string()).optional(),
  learningStyle: z.string().optional(),
  careerAwarenessAnswers: z.record(z.string()).optional(),
  projectExperience: z.string().optional(),
  internshipExperience: z.string().optional(),
  interviewReadiness: z.string().optional(),
  careerReadinessScore: z.number().int().min(0).max(100).optional(),
});

export const updateInterestsSchema = z.object({
  topics: z.array(z.string().min(1).max(100)).min(1).max(20),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdateInterestsInput = z.infer<typeof updateInterestsSchema>;
