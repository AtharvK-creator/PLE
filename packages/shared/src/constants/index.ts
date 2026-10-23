export const APP_NAME = 'PLE';
export const APP_DESCRIPTION = 'Personalized Learning Empowerment — AI-powered engineering learning platform';
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ple.app';

export const ENGINEERING_BRANCHES = [
  'Computer Science Engineering',
  'Electronics & Communication Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Electrical Engineering',
  'Information Technology',
  'Chemical Engineering',
  'Aerospace Engineering',
  'Biomedical Engineering',
  'Other',
] as const;

export const CAREER_GOALS = [
  'AI/ML Engineer',
  'Full Stack Developer',
  'Data Scientist',
  'Software Engineer',
  'DevOps/Cloud Engineer',
  'Embedded Systems Engineer',
  'Cybersecurity Engineer',
  'Product Manager',
  'Research Scientist',
  'Other',
] as const;

export const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

export const SKILL_CATEGORIES = [
  'Programming Languages',
  'Web Development',
  'Data Science & ML',
  'DevOps & Cloud',
  'Databases',
  'System Design',
  'Mathematics',
  'Core CS',
  'Soft Skills',
  'Domain Specific',
] as const;

export const API_ROUTES = {
  auth: {
    register: '/auth/register',
    login: '/auth/login',
    logout: '/auth/logout',
    refresh: '/auth/refresh',
    google: '/auth/google',
    forgotPassword: '/auth/forgot-password',
  },
  users: {
    me: '/users/me',
    profile: '/users/me/profile',
    interests: '/users/me/interests',
    skills: '/users/me/skills',
  },
  roadmap: {
    generate: '/roadmap/generate',
    list: '/roadmap',
    single: (id: string) => `/roadmap/${id}`,
    updateStep: (roadmapId: string, stepId: string) => `/roadmap/${roadmapId}/steps/${stepId}`,
  },
  tutor: {
    sessions: '/tutor/sessions',
    createSession: '/tutor/sessions',
    session: (id: string) => `/tutor/sessions/${id}`,
    sendMessage: (id: string) => `/tutor/sessions/${id}/messages`,
    stream: (id: string) => `/tutor/sessions/${id}/stream`,
  },
  quiz: {
    generate: '/quiz/generate',
    list: '/quiz',
    single: (id: string) => `/quiz/${id}`,
    submit: (id: string) => `/quiz/${id}/attempt`,
    history: '/quiz/attempts',
    attempt: (id: string) => `/quiz/attempts/${id}`,
  },
  dashboard: '/dashboard',
  featureFlags: '/feature-flags',
  skills: {
    catalog: '/skills',
    userSkills: '/users/me/skills',
    addSkill: '/users/me/skills',
  },
  learningGoals: {
    list: '/learning-goals',
    create: '/learning-goals',
    single: (id: string) => `/learning-goals/${id}`,
  },
  webhooks: {
    welcome: '/webhooks/welcome',
    reminder: '/webhooks/reminder',
    weeklyReport: '/webhooks/weekly-report',
  },
} as const;

export const ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  AI_PROVIDER_ERROR: 'AI_PROVIDER_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  FEATURE_DISABLED: 'FEATURE_DISABLED',
} as const;
