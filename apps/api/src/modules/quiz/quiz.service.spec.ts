import { Test, TestingModule } from '@nestjs/testing';
import { QuizService } from './quiz.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AIGatewayService } from '../ai-gateway/ai-gateway.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('QuizService (Unit)', () => {
  let service: QuizService;
  let prismaMock: any;
  let aiGatewayMock: any;
  let analyticsMock: any;

  beforeEach(async () => {
    prismaMock = {
      $transaction: jest.fn((cb) => cb(prismaMock)),
      quiz: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      question: {
        create: jest.fn(),
      },
      questionOption: {
        create: jest.fn(),
        createMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
      quizAttempt: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      attemptAnswer: {
        create: jest.fn(),
      },
    };

    aiGatewayMock = {
      generateAndParseJSON: jest.fn(),
    };

    analyticsMock = {
      capture: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuizService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: AIGatewayService, useValue: aiGatewayMock },
        { provide: AnalyticsService, useValue: analyticsMock },
      ],
    }).compile();

    service = module.get<QuizService>(QuizService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generate', () => {
    it('should throw BadRequestException if AI returns non-array or empty questions', async () => {
      aiGatewayMock.generateAndParseJSON.mockResolvedValue(null);
      await expect(
        service.generate('user-1', { topic: 'Data Structures', subject: 'CS', difficulty: 'EASY' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should generate quiz and save questions and options', async () => {
      const mockQuestions = [
        {
          questionText: 'What is a Binary Tree?',
          orderIndex: 1,
          explanation: 'Tree data structure with at most 2 children.',
          options: [
            { optionLabel: 'A', optionText: 'Linear List', isCorrect: false },
            { optionLabel: 'B', optionText: 'Tree Structure', isCorrect: true },
          ],
        },
      ];
      aiGatewayMock.generateAndParseJSON.mockResolvedValue(mockQuestions);

      prismaMock.quiz.create.mockResolvedValue({
        id: 'quiz-1',
        userId: 'user-1',
        topic: 'Data Structures',
        subject: 'CS',
        difficulty: 'EASY',
        totalQuestions: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      prismaMock.question.create.mockResolvedValue({ id: 'q-1', quizId: 'quiz-1' });
      prismaMock.questionOption.create.mockResolvedValue({ id: 'opt-1', questionId: 'q-1' });
      prismaMock.quiz.findFirst.mockResolvedValue({
        id: 'quiz-1',
        userId: 'user-1',
        topic: 'Data Structures',
        subject: 'CS',
        difficulty: 'EASY',
        totalQuestions: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        questions: [
          {
            id: 'q-1',
            quizId: 'quiz-1',
            questionText: 'What is a Binary Tree?',
            orderIndex: 1,
            explanation: 'Tree data structure with at most 2 children.',
            options: [
              { id: 'opt-1', optionLabel: 'A', optionText: 'Linear List', isCorrect: false },
              { id: 'opt-2', optionLabel: 'B', optionText: 'Tree Structure', isCorrect: true },
            ],
          },
        ],
      });

      const result = await service.generate('user-1', {
        topic: 'Data Structures',
        subject: 'CS',
        difficulty: 'EASY',
      });

      expect(result.id).toBe('quiz-1');
      expect(prismaMock.quiz.create).toHaveBeenCalled();
    });
  });

  describe('submitAttempt', () => {
    it('should throw NotFoundException if quiz is not found', async () => {
      prismaMock.quiz.findFirst.mockResolvedValue(null);
      await expect(
        service.submitAttempt('user-1', 'non-existent-quiz', { answers: [], timeTakenSeconds: 60 }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
