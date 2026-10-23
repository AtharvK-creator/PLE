export type FeatureFlagName = 'aiTutor' | 'roadmap' | 'quizzes' | 'dashboard' | 'eyt';

export interface FeatureFlagDto {
  id: string;
  name: string;
  enabled: boolean;
  description?: string;
  createdAt: string;
  updatedAt: string;
}
