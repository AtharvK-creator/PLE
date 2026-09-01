export type RoadmapStatus = 'ACTIVE' | 'ARCHIVED';

export interface GenerateRoadmapDto {
  goal: string;
  branch: string;
  semester: number;
  currentSkillLevel?: string;
}

export interface RoadmapStepDto {
  id: string;
  title: string;
  description: string;
  weekNumber: number;
  monthNumber: number;
  orderIndex: number;
  isCompleted: boolean;
  completedAt?: string;
  skills: string[];
}

export interface RoadmapDto {
  id: string;
  userId: string;
  title: string;
  goal: string;
  branch: string;
  semester: number;
  status: RoadmapStatus;
  steps: RoadmapStepDto[];
  createdAt: string;
  updatedAt: string;
}
