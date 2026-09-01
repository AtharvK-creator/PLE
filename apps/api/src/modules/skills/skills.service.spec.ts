import { Test, TestingModule } from '@nestjs/testing';
import { SkillsService } from './skills.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('SkillsService (Unit)', () => {
  let service: SkillsService;
  let prismaMock: any;

  beforeEach(async () => {
    prismaMock = {
      skill: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      userSkill: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SkillsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<SkillsService>(SkillsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCatalog', () => {
    it('should return mapped skill catalog', async () => {
      const now = new Date();
      prismaMock.skill.findMany.mockResolvedValue([
        {
          id: 'skill-1',
          name: 'TypeScript',
          slug: 'typescript',
          category: 'Programming',
          description: 'Typed JavaScript',
          iconUrl: null,
          subtopics: ['Generics'],
          createdAt: now,
          updatedAt: now,
        },
      ]);

      const result = await service.getCatalog('TypeScript');
      expect(result.length).toBe(1);
      expect(result[0].name).toBe('TypeScript');
    });
  });

  describe('addUserSkill', () => {
    it('should throw NotFoundException if skill does not exist', async () => {
      prismaMock.skill.findUnique.mockResolvedValue(null);
      await expect(
        service.addUserSkill('user-1', { skillId: 'invalid-id', level: 'BEGINNER' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
