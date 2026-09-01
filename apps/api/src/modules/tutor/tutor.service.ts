import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AIGatewayService } from '../ai-gateway/ai-gateway.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { buildTutorSystemPrompt, buildCodeTutorSystemPrompt } from '../ai-gateway/prompts/tutor.prompt';
import { CreateSessionDto } from './dto/create-session.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { LearningSessionDto, MessageDto } from '@ple/types';
import { TutorMode } from '@prisma/client';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

import { HybridRetrievalService } from '../intelligence/services/hybrid-retrieval.service';

@Injectable()
export class TutorService {
  private readonly logger = new Logger(TutorService.name);
  private readonly sessionSummaries = new Map<string, { messageCount: number; summary: string }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiGateway: AIGatewayService,
    private readonly analytics: AnalyticsService,
    private readonly hybridRetrieval?: HybridRetrievalService,
  ) {}

  async createSession(userId: string, dto: CreateSessionDto): Promise<LearningSessionDto> {
    const session = await this.prisma.learningSession.create({
      data: {
        userId,
        title: dto.title ?? 'New Conversation',
        mode: (dto.mode ?? 'LEARN') as TutorMode,
      },
      include: { messages: true },
    });
    return this.toSessionDto(session);
  }

  async getSessions(userId: string, mode?: 'LEARN' | 'CODE', page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const sessions = await this.prisma.learningSession.findMany({
      where: {
        userId,
        mode: (mode ?? 'LEARN') as TutorMode,
      },
      skip,
      take: limit,
      include: { _count: { select: { messages: true } } },
      orderBy: { updatedAt: 'desc' },
    });
    return sessions.map((s) => ({
      id: s.id,
      userId: s.userId,
      title: s.title,
      mode: s.mode as 'LEARN' | 'CODE',
      messageCount: s._count.messages,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    }));
  }

  private async getSummarizedContext(sessionId: string, messages: any[], maxHistory: number): Promise<string> {
    if (messages.length <= maxHistory) return '';

    const olderMessages = messages.slice(0, -maxHistory);
    const cacheKey = sessionId;
    const cached = this.sessionSummaries.get(cacheKey);

    if (cached && cached.messageCount === olderMessages.length) {
      return cached.summary;
    }

    const summaryPrompt = `Summarize the technical topics, requirements, and decisions made in the following conversation history briefly (under 80 words):\n\n${olderMessages
      .map((m) => `${m.role === 'USER' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n')}`;

    try {
      this.logger.log(`Generating summary of ${olderMessages.length} older messages for session ${sessionId}...`);
      const summaryRes = await this.aiGateway.generate(
        'tutor',
        summaryPrompt,
        'You are a helpful assistant that summarizes programming/learning conversation history.',
      );
      const summary = summaryRes.content.trim();
      this.sessionSummaries.set(cacheKey, { messageCount: olderMessages.length, summary });
      return summary;
    } catch (err: any) {
      this.logger.warn(`Failed to generate older message summary: ${err.message}`);
      return '(Older history summary unavailable)';
    }
  }

  async getSession(userId: string, sessionId: string): Promise<LearningSessionDto> {
    const session = await this.prisma.learningSession.findFirst({
      where: { id: sessionId, userId },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!session) throw new NotFoundException('Session not found');
    return this.toSessionDto(session);
  }

  async sendMessage(
    userId: string,
    sessionId: string,
    dto: SendMessageDto,
  ): Promise<MessageDto> {
    const session = await this.prisma.learningSession.findFirst({
      where: { id: sessionId, userId },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!session) throw new NotFoundException('Session not found');

    const userTokens = Math.round(dto.content.length / 4);

    // Store user message
    await this.prisma.message.create({
      data: {
        sessionId,
        role: 'USER',
        content: dto.content,
        tokenCount: userTokens,
      },
    });

    // Cost control: Limit context size (15 for LEARN, 10 for CODE)
    const maxHistory = session.mode === 'CODE' ? 10 : 15;
    const summarizedContext = await this.getSummarizedContext(sessionId, session.messages, maxHistory);

    const history = session.messages.slice(-maxHistory).map((m) => ({
      role: m.role === 'USER' ? ('user' as const) : ('model' as const),
      content: m.content,
    }));

    if (summarizedContext) {
      history.unshift(
        {
          role: 'user' as const,
          content: `[Context Summary of previous conversation history: ${summarizedContext}]`,
        },
        {
          role: 'model' as const,
          content: `Understood. I will keep this summary context in mind for our conversation.`,
        },
      );
    }

    const promptInput = await this.getTutorPromptInput(userId);
    let systemPrompt =
      session.mode === 'CODE'
        ? buildCodeTutorSystemPrompt(promptInput, dto.expertMode)
        : buildTutorSystemPrompt(promptInput);

    if (this.hybridRetrieval) {
      try {
        const smartResult = await this.hybridRetrieval.retrieveHybridContext(userId, dto.content);
        if (smartResult.isSmartPath && smartResult.promptContext) {
          systemPrompt += `\n\n${smartResult.promptContext}`;
        }
      } catch (e: any) {
        this.logger.warn(`Smart Path retrieval fallback: ${e.message}`);
      }
    }

    const providerOverride = session.mode === 'CODE' ? 'groq' : 'gemini';

    const startTime = Date.now();
    let aiResponse;
    try {
      aiResponse = await this.aiGateway.generate(
        'tutor',
        dto.content,
        systemPrompt,
        providerOverride,
      );
    } catch (err: any) {
      const responseTime = Date.now() - startTime;
      this.logger.error(
        `[Tutor Observability] Session: ${sessionId} | Mode: ${session.mode} | Error: ${err.message} | Response Time: ${responseTime}ms`,
      );
      this.analytics.capture(userId, 'ai_tutor_message_failed', {
        sessionId,
        mode: session.mode,
        provider: providerOverride,
        responseTime,
        error: err.message,
      });
      throw err;
    }

    const responseTime = Date.now() - startTime;
    const estimatedTokens = Math.round(aiResponse.content.length / 4);
    const isFallback = aiResponse.provider === 'gemini' && session.mode === 'CODE';

    const metadata = {
      provider: aiResponse.provider,
      model: aiResponse.model ?? (aiResponse.provider === 'groq' ? 'llama-3.3-70b-versatile' : 'gemini-1.5-flash'),
      responseTime,
      tutorMode: session.mode,
      fallbackTriggered: isFallback,
      estimatedTokens,
    };

    const assistantMessage = await this.prisma.message.create({
      data: {
        sessionId,
        role: 'ASSISTANT',
        content: aiResponse.content,
        tokenCount: estimatedTokens,
        metadata: metadata as any,
      },
    });

    await this.updateSessionTitle(session, dto.content);

    // Logging metrics for observability
    this.logger.log(
      `[Tutor Observability] Session: ${sessionId} | Mode: ${session.mode} | Provider: ${aiResponse.provider} | Model: ${metadata.model} | Response Time: ${responseTime}ms | User Tokens: ${userTokens} | Assistant Tokens: ${estimatedTokens} | Fallback: ${isFallback}`,
    );

    // Observability: Capture stats
    this.analytics.capture(userId, 'ai_tutor_message_sent', {
      sessionId,
      mode: session.mode,
      provider: aiResponse.provider,
      responseTime,
      messageLength: dto.content.length,
      responseLength: aiResponse.content.length,
    });

    return {
      id: assistantMessage.id,
      role: 'ASSISTANT',
      content: assistantMessage.content,
      tokenCount: assistantMessage.tokenCount ?? undefined,
      metadata: metadata,
      createdAt: assistantMessage.createdAt.toISOString(),
    };
  }

  async *streamMessage(
    userId: string,
    sessionId: string,
    dto: SendMessageDto,
  ): AsyncGenerator<string, void, unknown> {
    const session = await this.prisma.learningSession.findFirst({
      where: { id: sessionId, userId },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!session) throw new NotFoundException('Session not found');

    const userTokens = Math.round(dto.content.length / 4);

    await this.prisma.message.create({
      data: {
        sessionId,
        role: 'USER',
        content: dto.content,
        tokenCount: userTokens,
        metadata: dto.file ? { attachment: dto.file } : undefined,
      },
    });

    // Cost control: Limit context size (15 for LEARN, 10 for CODE)
    const maxHistory = session.mode === 'CODE' ? 10 : 15;
    const summarizedContext = await this.getSummarizedContext(sessionId, session.messages, maxHistory);

    const history = session.messages.slice(-maxHistory).map((m) => ({
      role: m.role === 'USER' ? ('user' as const) : ('model' as const),
      content: m.content,
    }));

    if (summarizedContext) {
      history.unshift(
        {
          role: 'user' as const,
          content: `[Context Summary of previous conversation history: ${summarizedContext}]`,
        },
        {
          role: 'model' as const,
          content: `Understood. I will keep this summary context in mind for our conversation.`,
        },
      );
    }

    const promptInput = await this.getTutorPromptInput(userId);
    const systemPrompt =
      session.mode === 'CODE'
        ? buildCodeTutorSystemPrompt(promptInput, dto.expertMode)
        : buildTutorSystemPrompt(promptInput);

    const providerOverride = session.mode === 'CODE' ? 'groq' : 'gemini';

    let fullContent = '';
    const startTime = Date.now();

    let attachmentData: { mimeType: string; base64Data: string } | undefined = undefined;

    if (dto.file) {
      try {
        const filePath = join(process.cwd(), dto.file.url);
        if (existsSync(filePath)) {
          const fileBuffer = readFileSync(filePath);
          attachmentData = {
            mimeType: dto.file.mimeType,
            base64Data: fileBuffer.toString('base64'),
          };
        }
      } catch (err: any) {
        this.logger.error(`Failed to read message attachment file: ${err.message}`);
      }
    }

    try {
      const stream = this.aiGateway.generateStream(
        'tutor',
        dto.content,
        systemPrompt,
        history,
        providerOverride,
        attachmentData,
      );

      for await (const chunk of stream) {
        fullContent += chunk;
        yield chunk;
      }
    } catch (err: any) {
      const responseTime = Date.now() - startTime;
      this.logger.error(
        `[Tutor Observability] Stream Failed | Session: ${sessionId} | Mode: ${session.mode} | Error: ${err.message} | Response Time: ${responseTime}ms`,
      );
      this.analytics.capture(userId, 'ai_tutor_stream_failed', {
        sessionId,
        mode: session.mode,
        provider: providerOverride,
        responseTime,
        error: err.message,
      });
      throw err;
    }

    const responseTime = Date.now() - startTime;
    const fallbackTriggered = fullContent.includes('__SYSTEM_FALLBACK_PROVIDER__');
    const cleanedContent = fullContent.replace('__SYSTEM_FALLBACK_PROVIDER__', '').trim();
    const providerUsed = fallbackTriggered ? 'gemini' : (session.mode === 'CODE' ? 'groq' : 'gemini');
    const modelUsed = providerUsed === 'groq' ? 'llama-3.3-70b-versatile' : 'gemini-1.5-flash';
    const estimatedTokens = Math.round(cleanedContent.length / 4);

    const metadata = {
      provider: providerUsed,
      model: modelUsed,
      responseTime,
      tutorMode: session.mode,
      fallbackTriggered,
      estimatedTokens,
    };

    await this.prisma.message.create({
      data: {
        sessionId,
        role: 'ASSISTANT',
        content: cleanedContent,
        tokenCount: estimatedTokens,
        metadata: metadata as any,
      },
    });

    await this.updateSessionTitle(session, dto.content);

    // Logging metrics for observability
    this.logger.log(
      `[Tutor Observability] Session: ${sessionId} | Mode: ${session.mode} | Provider: ${providerUsed} | Model: ${modelUsed} | Response Time: ${responseTime}ms | User Tokens: ${userTokens} | Assistant Tokens: ${estimatedTokens} | Fallback: ${fallbackTriggered}`,
    );

    // Observability: Capture stats
    this.analytics.capture(userId, 'ai_tutor_message_sent', {
      sessionId,
      mode: session.mode,
      provider: providerUsed,
      responseTime,
      messageLength: dto.content.length,
      responseLength: cleanedContent.length,
    });
  }

  async deleteSession(userId: string, sessionId: string): Promise<void> {
    const session = await this.prisma.learningSession.findFirst({
      where: { id: sessionId, userId },
    });
    if (!session) throw new NotFoundException('Session not found');
    await this.prisma.learningSession.delete({ where: { id: sessionId } });
  }

  private async updateSessionTitle(
    session: { id: string; title: string; messages: Array<unknown> },
    userMessage: string,
  ): Promise<void> {
    if (session.messages.length === 0 && session.title === 'New Conversation') {
      const titlePreview =
        userMessage.slice(0, 60) + (userMessage.length > 60 ? '...' : '');
      await this.prisma.learningSession.update({
        where: { id: session.id },
        data: { title: titlePreview },
      });
    } else {
      await this.prisma.learningSession.update({
        where: { id: session.id },
        data: { updatedAt: new Date() },
      });
    }
  }

  private toSessionDto(session: {
    id: string;
    userId: string;
    title: string;
    mode: TutorMode;
    createdAt: Date;
    updatedAt: Date;
    messages: Array<{
      id: string;
      role: string;
      content: string;
      tokenCount: number | null;
      metadata: any;
      createdAt: Date;
    }>;
  }): LearningSessionDto {
    return {
      id: session.id,
      userId: session.userId,
      title: session.title,
      mode: session.mode as 'LEARN' | 'CODE',
      messages: session.messages.map((m) => ({
        id: m.id,
        role: m.role as MessageDto['role'],
        content: m.content,
        tokenCount: m.tokenCount ?? undefined,
        metadata: m.metadata ? (m.metadata as any) : undefined,
        createdAt: m.createdAt.toISOString(),
      })),
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    };
  }

  private async getTutorPromptInput(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    const activeRoadmap = await this.prisma.roadmap.findFirst({
      where: { userId, status: 'ACTIVE' },
      include: { steps: true },
    });

    let roadmapProgress = null;
    if (activeRoadmap) {
      const totalSteps = activeRoadmap.steps.length;
      const completedSteps = activeRoadmap.steps.filter((s) => s.isCompleted).length;
      roadmapProgress = {
        title: activeRoadmap.title,
        goal: activeRoadmap.goal,
        completedSteps,
        totalSteps,
      };
    }

    const quizAttempts = await this.prisma.quizAttempt.findMany({
      where: { userId },
      select: { score: true },
    });

    const totalAttempts = quizAttempts.length;
    const avgScoreResult = await this.prisma.quizAttempt.aggregate({
      where: { userId },
      _avg: { score: true },
    });
    const averageScore = avgScoreResult._avg.score ? Math.round(avgScoreResult._avg.score) : 0;

    const userSkills = await this.prisma.userSkill.findMany({
      where: { userId },
      include: { skill: true },
    });

    const completedSkills = userSkills.map((us) => ({
      name: us.skill.name,
      level: us.level,
      completedSubtopics: us.completedSubtopics || [],
    }));

    return {
      studentName: profile?.name,
      branch: profile?.branch,
      semester: profile?.semester,
      skillLevel: profile?.skillLevel,
      careerGoal: profile?.careerGoal,
      knowledgeDomains: profile?.knowledgeDomains || [],
      domainSkillLevels: (profile?.domainSkillLevels as Record<string, string>) || {},
      careerReadinessScore: profile?.careerReadinessScore || 0,
      roadmapProgress,
      quizPerformance: {
        totalAttempts,
        averageScore,
      },
      completedSkills,
    };
  }
}
