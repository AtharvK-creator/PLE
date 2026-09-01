export type MessageRole = 'USER' | 'ASSISTANT';

export interface MessageMetadata {
  provider?: string;
  model?: string;
  responseTime?: number;
  tutorMode?: 'LEARN' | 'CODE';
  fallbackTriggered?: boolean;
  estimatedTokens?: number;
}

export interface MessageDto {
  id: string;
  role: MessageRole;
  content: string;
  tokenCount?: number;
  metadata?: MessageMetadata;
  createdAt: string;
}

export interface LearningSessionDto {
  id: string;
  userId: string;
  title: string;
  mode: 'LEARN' | 'CODE';
  messages: MessageDto[];
  createdAt: string;
  updatedAt: string;
}

export interface SendMessageDto {
  content: string;
  sessionId?: string;
  expertMode?: boolean;
}

export interface CreateSessionDto {
  title?: string;
  mode?: 'LEARN' | 'CODE';
}
