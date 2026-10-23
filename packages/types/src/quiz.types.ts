export type QuizDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface GenerateQuizDto {
  topic: string;
  subject: string;
  difficulty: QuizDifficulty;
  totalQuestions?: number;
}

export interface QuestionOptionDto {
  id: string;
  optionText: string;
  optionLabel: string;
}

export interface QuestionDto {
  id: string;
  questionText: string;
  orderIndex: number;
  explanation?: string;
  options: QuestionOptionDto[];
}

export interface QuizDto {
  id: string;
  userId: string;
  topic: string;
  subject: string;
  difficulty: QuizDifficulty;
  totalQuestions: number;
  questions: QuestionDto[];
  createdAt: string;
}

export interface SubmitAttemptDto {
  answers: Array<{
    questionId: string;
    selectedOptionId: string;
  }>;
  timeTakenSeconds: number;
}

export interface AttemptResultDto {
  id: string;
  quizId: string;
  score: number;
  totalQuestions: number;
  timeTakenSeconds: number;
  percentage: number;
  answers: Array<{
    questionId: string;
    questionText: string;
    selectedOptionId: string | null;
    isCorrect: boolean;
    explanation?: string;
    correctOptionId: string;
  }>;
  completedAt: string;
}
