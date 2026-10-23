import { z } from 'zod';

export const generateQuizSchema = z.object({
  topic: z.string().min(1).max(200),
  subject: z.string().min(1).max(200),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']),
  totalQuestions: z.number().int().min(5).max(20).default(10),
});

export const submitAttemptSchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.string(),
        selectedOptionId: z.string(),
      }),
    )
    .min(1),
  timeTakenSeconds: z.number().int().min(0),
});

export type GenerateQuizInput = z.infer<typeof generateQuizSchema>;
export type SubmitAttemptInput = z.infer<typeof submitAttemptSchema>;
