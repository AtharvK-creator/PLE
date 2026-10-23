export type AITask = 'roadmap' | 'quiz' | 'tutor' | 'resume' | 'eyt';
export type AIProvider = 'gemini' | 'groq';

export interface AIRequest {
  task: AITask;
  prompt: string;
  systemPrompt?: string;
  history?: Array<{ role: 'user' | 'model'; content: string }>;
  stream?: boolean;
}

export interface AIResponse {
  content: string;
  provider: AIProvider;
  model: string;
  tokensUsed?: number;
}

export interface AIGatewayConfig {
  provider: AIProvider;
  geminiModel: string;
  geminiModelQuiz: string;
  groqModel: string;
  groqModelQuiz: string;
}
