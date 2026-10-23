export interface SubtopicDto {
  name: string;
  difficulty: string;
  duration: string;
}

export interface SkillDto {
  id: string;
  name: string;
  slug: string;
  category: string;
  description?: string;
  iconUrl?: string;
  subtopics?: SubtopicDto[];
  createdAt: string;
}

export interface UserSkillDto {
  id: string;
  skillId: string;
  skill: SkillDto;
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  completedSubtopics?: string[];
  createdAt: string;
}

export interface AddUserSkillDto {
  skillId: string;
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
}
