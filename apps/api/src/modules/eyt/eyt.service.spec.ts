import { Test, TestingModule } from '@nestjs/testing';
import { EytService } from './eyt.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EytEvaluationService } from './eyt-evaluation.service';
import { EytRecommendationService } from './eyt-recommendation.service';
import { EytAnalyticsService } from './eyt-analytics.service';
import { NotFoundException } from '@nestjs/common';

describe('EytService (Unit)', () => {
  let service: EytService;
  let prismaMock: any;
  let evalMock: any;
  let recMock: any;
  let analyticsMock: any;

  beforeEach(async () => {
    prismaMock = {
      profile: {
        findUnique: jest.fn(),
        update: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      eytChallenge: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      eytAttempt: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        aggregate: jest.fn().mockResolvedValue({ _avg: { similarityPercent: 85 } }),
      },
      eytFavorite: {
        findUnique: jest.fn(),
        delete: jest.fn(),
        create: jest.fn(),
      },
      eytDifficultyVote: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
    };

    evalMock = {
      evaluateThinking: jest.fn().mockResolvedValue({
        scores: {
          logicalReasoning: 80,
          originality: 75,
          decomposition: 85,
          accuracy: 90,
          creativity: 70,
          reflection: 80,
          confidenceCalibration: 85,
          overall: 81,
        },
        feedback: {
          thinkingAuthenticityScore: 95,
          thinkingAuthenticityFeedback: 'Original thinking detected',
          reasoningDifference: 'Clear explanation',
          feedbackOriginality: 'High',
          feedbackStrengths: 'Decomposition',
          feedbackWeaknesses: 'Boundary cases',
          hiddenAssumptions: 'None',
          alternativePerspective: 'Consider scale',
          industryPerspective: 'Used at scale',
          interviewPerspective: 'Strong candidate',
          learningResources: [],
        },
        earnedXP: 100,
        unlockedBadges: [],
      }),
    };

    recMock = {
      getRecommendations: jest.fn().mockResolvedValue([]),
    };

    analyticsMock = {
      trackAttempt: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EytService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: EytEvaluationService, useValue: evalMock },
        { provide: EytRecommendationService, useValue: recMock },
        { provide: EytAnalyticsService, useValue: analyticsMock },
      ],
    }).compile();

    service = module.get<EytService>(EytService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getDashboard', () => {
    it('should throw NotFoundException if profile does not exist', async () => {
      prismaMock.profile.findUnique.mockResolvedValue(null);
      await expect(service.getDashboard('user-1')).rejects.toThrow(NotFoundException);
    });

    it('should return dashboard data when profile exists', async () => {
      const now = new Date();
      prismaMock.profile.findUnique.mockResolvedValue({
        userId: 'user-1',
        thinkingScore: 80,
        thinkingXP: 400,
        thinkingLevel: 'Intermediate',
        currentStreak: 3,
        bestStreak: 5,
        challengesSolved: 5,
        updatedAt: now,
      });
      prismaMock.profile.count.mockResolvedValue(0);
      prismaMock.profile.update.mockResolvedValue({
        userId: 'user-1',
        thinkingScore: 80,
        thinkingXP: 400,
        thinkingLevel: 'Intermediate',
        currentStreak: 3,
        bestStreak: 5,
        challengesSolved: 5,
        updatedAt: now,
      });

      prismaMock.eytChallenge.findFirst.mockResolvedValue(null);
      prismaMock.eytAttempt.findMany.mockResolvedValue([]);
      analyticsMock.getMonthlyReport = jest.fn().mockResolvedValue({});

      const result = await service.getDashboard('user-1');
      expect(result.stats.thinkingScore).toBe(80);
      expect(result.stats.thinkingLevel).toBe('Intermediate');
    });
  });

  describe('getChallenge', () => {
    it('should throw NotFoundException if challenge does not exist', async () => {
      prismaMock.eytChallenge.findFirst.mockResolvedValue(null);
      await expect(service.getChallenge('user-1', 'non-existent')).rejects.toThrow(NotFoundException);
    });
  });
});
