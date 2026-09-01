import { Test, TestingModule } from '@nestjs/testing';
import { TutorService } from './tutor.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AIGatewayService } from '../ai-gateway/ai-gateway.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { NotFoundException } from '@nestjs/common';
import { HybridRetrievalService } from '../intelligence/services/hybrid-retrieval.service';

describe('TutorService (Unit)', () => {
  let service: TutorService;
  let prismaMock: any;
  let aiGatewayMock: any;
  let analyticsMock: any;
  let hybridRetrievalMock: any;

  beforeEach(async () => {
    hybridRetrievalMock = {
      retrieveHybridContext: jest.fn().mockResolvedValue({
        isSmartPath: false,
        promptContext: '',
        rankedItems: [],
        executionTimeMs: 10,
      }),
    };

    prismaMock = {
      learningSession: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      message: {
        create: jest.fn(),
        findMany: jest.fn().mockImplementation(() => Promise.resolve([])),
      },
      profile: {
        findUnique: jest.fn(),
      },
      roadmap: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      quizAttempt: {
        findMany: jest.fn().mockResolvedValue([]),
        aggregate: jest.fn().mockResolvedValue({ _avg: { score: 85 } }),
      },
      userSkill: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    aiGatewayMock = {
      generate: jest.fn().mockResolvedValue({ content: 'Mocked AI Tutor response text', provider: 'gemini', model: 'default' }),
      generateText: jest.fn().mockResolvedValue('Mocked AI Tutor response text'),
      streamText: jest.fn(),
    };

    analyticsMock = {
      capture: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TutorService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: AIGatewayService, useValue: aiGatewayMock },
        { provide: AnalyticsService, useValue: analyticsMock },
        { provide: HybridRetrievalService, useValue: hybridRetrievalMock },
      ],
    }).compile();

    service = module.get<TutorService>(TutorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createSession', () => {
    it('should create and return a new learning session', async () => {
      const now = new Date();
      prismaMock.learningSession.create.mockResolvedValue({
        id: 'session-1',
        userId: 'user-1',
        title: 'New Conversation',
        mode: 'LEARN',
        createdAt: now,
        updatedAt: now,
        messages: [],
      });

      const result = await service.createSession('user-1', { title: 'New Conversation', mode: 'LEARN' });
      expect(result.id).toBe('session-1');
      expect(result.mode).toBe('LEARN');
      expect(prismaMock.learningSession.create).toHaveBeenCalled();
    });
  });

  describe('getSession', () => {
    it('should throw NotFoundException if session does not exist', async () => {
      prismaMock.learningSession.findFirst.mockResolvedValue(null);
      await expect(service.getSession('user-1', 'non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('sendMessage', () => {
    it('should create user message, call AI gateway, and return assistant response', async () => {
      const now = new Date();
      prismaMock.learningSession.findFirst.mockResolvedValue({
        id: 'session-1',
        userId: 'user-1',
        title: 'Python Chat',
        mode: 'LEARN',
        createdAt: now,
        updatedAt: now,
        messages: [],
      });

      prismaMock.message.create
        .mockResolvedValueOnce({
          id: 'msg-user-1',
          sessionId: 'session-1',
          role: 'USER',
          content: 'Explain recursion',
          createdAt: now,
        })
        .mockResolvedValueOnce({
          id: 'msg-ai-1',
          sessionId: 'session-1',
          role: 'ASSISTANT',
          content: 'Mocked AI Tutor response text',
          createdAt: now,
        });

      prismaMock.message.findMany.mockResolvedValue([
        { id: 'm-1', role: 'USER', content: 'Hi' },
      ]);
      prismaMock.profile.findUnique.mockResolvedValue(null);

      const result = await service.sendMessage('user-1', 'session-1', { content: 'Explain recursion' });
      expect(result.content).toBe('Mocked AI Tutor response text');
      expect(result.role).toBe('ASSISTANT');
      expect(aiGatewayMock.generate).toHaveBeenCalled();
    });
  });
});
