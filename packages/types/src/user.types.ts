import { UserRole } from './auth.types';

export type SkillLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

export interface UserDto {
  id: string;
  email: string;
  role: UserRole;
  emailVerified: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  profile?: ProfileDto;
}

export interface ProfileDto {
  id: string;
  userId: string;
  name: string;
  branch: string;
  semester: number;
  skillLevel: SkillLevel;
  careerGoal: string;
  bio?: string;
  avatarUrl?: string;
  knowledgeDomains?: string[];
  domainSkillLevels?: Record<string, string>;
  learningStyle?: string;
  careerAwarenessAnswers?: Record<string, string>;
  projectExperience?: string;
  internshipExperience?: string;
  interviewReadiness?: string;
  careerReadinessScore?: number;
  resume?: any;
  thinkingScore?: number;
  thinkingXP?: number;
  thinkingLevel?: string;
  thinkingRank?: string | null;
  currentStreak?: number;
  bestStreak?: number;
  challengesSolved?: number;
  scoreLogicalReasoning?: number;
  scoreOriginality?: number;
  scoreReflection?: number;
  scoreCreativity?: number;
  scoreDecomposition?: number;
  scoreAccuracy?: number;
  scoreConfidenceCalibration?: number;
  totalThinkingTimeSeconds?: number;
  createdAt: string;
  updatedAt: string;
  interests: InterestDto[];
}

export interface InterestDto {
  id: string;
  topic: string;
}

export interface UpdateProfileDto {
  name?: string;
  branch?: string;
  semester?: number;
  skillLevel?: SkillLevel;
  careerGoal?: string;
  bio?: string;
  avatarUrl?: string;
  knowledgeDomains?: string[];
  domainSkillLevels?: Record<string, string>;
  learningStyle?: string;
  careerAwarenessAnswers?: Record<string, string>;
  projectExperience?: string;
  internshipExperience?: string;
  interviewReadiness?: string;
  careerReadinessScore?: number;
  resume?: any;
}

export interface UpdateInterestsDto {
  topics: string[];
}
