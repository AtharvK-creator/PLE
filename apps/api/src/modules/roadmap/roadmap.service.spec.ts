import { Test, TestingModule } from '@nestjs/testing';
import { RoadmapService } from './roadmap.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AIGatewayService } from '../ai-gateway/ai-gateway.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { NotFoundException } from '@nestjs/common';

describe('RoadmapService (Unit)', () => {
  let service: RoadmapService;
  let prismaMock: any;
  let aiGatewayMock: any;
  let analyticsMock: any;

  beforeEach(async () => {
    prismaMock = {
      $transaction: jest.fn((cb) => cb(prismaMock)),
      skill: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      roadmap: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      roadmapStep: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      roadmapSkill: {
        create: jest.fn(),
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };

    aiGatewayMock = {
      generateAndParseJSON: jest.fn().mockResolvedValue({
        title: '6-Month Backend Developer Roadmap',
        overview: 'Master Node.js, Express, PostgreSQL, and Docker.',
        steps: [
          {
            title: 'Week 1: Fundamentals',
            description: 'Learn JS ES6+ and Node.js basics.',
            weekNumber: 1,
            monthNumber: 1,
            orderIndex: 1,
            skills: ['Node.js'],
          },
        ],
      }),
    };

    analyticsMock = {
      capture: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoadmapService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: AIGatewayService, useValue: aiGatewayMock },
        { provide: AnalyticsService, useValue: analyticsMock },
      ],
    }).compile();

    service = module.get<RoadmapService>(RoadmapService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generate', () => {
    it('should generate roadmap and insert steps and skills', async () => {
      const now = new Date();
      prismaMock.roadmap.create.mockResolvedValue({
        id: 'rm-1',
        userId: 'user-1',
        title: '6-Month Backend Developer Roadmap',
        goal: 'Backend Dev',
        branch: 'Computer Science',
        semester: 5,
        status: 'ACTIVE',
        createdAt: now,
        updatedAt: now,
      });

      prismaMock.roadmapStep.create.mockResolvedValue({ id: 'step-1' });
      prismaMock.roadmapSkill.create.mockResolvedValue({ id: 'rskill-1' });

      prismaMock.roadmap.findFirst.mockResolvedValue({
        id: 'rm-1',
        userId: 'user-1',
        title: '6-Month Backend Developer Roadmap',
        goal: 'Backend Dev',
        branch: 'Computer Science',
        semester: 5,
        status: 'ACTIVE',
        createdAt: now,
        updatedAt: now,
        steps: [],
      });

      const result = await service.generate('user-1', {
        goal: 'Backend Dev',
        branch: 'Computer Science',
        semester: 5,
      });

      expect(result.id).toBe('rm-1');
      expect(prismaMock.roadmap.create).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should throw NotFoundException if roadmap does not exist', async () => {
      prismaMock.roadmap.findFirst.mockResolvedValue(null);
      await expect(service.findById('user-1', 'invalid-rm-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
