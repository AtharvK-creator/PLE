export type AnalyticsEvent =
  | 'user_registered'
  | 'user_logged_in'
  | 'roadmap_generated'
  | 'quiz_generated'
  | 'quiz_completed'
  | 'ai_tutor_message_sent'
  | 'ai_tutor_message_failed'
  | 'ai_tutor_stream_failed'
  | 'dashboard_visited';

export interface AnalyticsEventProperties {
  user_registered: { method: 'email' | 'google' };
  user_logged_in: { method: 'email' | 'google' };
  roadmap_generated: { goal: string; branch: string; semester: number };
  quiz_generated: { topic: string; difficulty: string; totalQuestions: number };
  quiz_completed: { score: number; totalQuestions: number; timeTaken: number };
  ai_tutor_message_sent: {
    sessionId: string;
    mode?: string;
    provider?: string;
    responseTime?: number;
    messageLength?: number;
    responseLength?: number;
  };
  ai_tutor_message_failed: {
    sessionId: string;
    mode?: string;
    provider?: string;
    responseTime?: number;
    error?: string;
  };
  ai_tutor_stream_failed: {
    sessionId: string;
    mode?: string;
    provider?: string;
    responseTime?: number;
    error?: string;
  };
  dashboard_visited: Record<string, never>;
}
