export type LearningGoalStatus = 'ACTIVE' | 'COMPLETED' | 'PAUSED';

export interface LearningGoalDto {
  id: string;
  userId: string;
  title: string;
  description?: string;
  targetDate?: string;
  status: LearningGoalStatus;
  roadmapId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLearningGoalDto {
  title: string;
  description?: string;
  targetDate?: string;
}

export interface UpdateLearningGoalDto {
  title?: string;
  description?: string;
  targetDate?: string;
  status?: LearningGoalStatus;
  roadmapId?: string;
}
