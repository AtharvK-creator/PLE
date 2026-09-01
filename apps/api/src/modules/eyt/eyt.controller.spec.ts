import { Test, TestingModule } from '@nestjs/testing';
import { EytController } from './eyt.controller';
import { EytService } from './eyt.service';
import { ChallengeIntelligenceService } from './challenge-intelligence.service';
import { FeatureFlagGuard } from '../../common/guards/feature-flag.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

describe('EytController (API Level)', () => {
  let controller: EytController;
  let eytServiceMock: any;
  let intelligenceMock: any;

  beforeEach(async () => {
    eytServiceMock = {
      getDashboard: jest.fn().mockResolvedValue({ thinkingScore: 80 }),
      getChallenges: jest.fn().mockResolvedValue({ challenges: [], total: 0 }),
      getChallenge: jest.fn().mockResolvedValue({ id: 'ch-1', title: 'System Design Challenge' }),
      submitStage1: jest.fn().mockResolvedValue({ attemptId: 'att-1', stage: 1 }),
      submitStage2: jest.fn().mockResolvedValue({ attempt: { id: 'att-1' }, awardedBadges: [], xpGained: 100 }),
      toggleFavorite: jest.fn().mockResolvedValue({ isFavorite: true }),
      submitRating: jest.fn().mockResolvedValue({ averageRating: 4.5 }),
    };

    intelligenceMock = {
      ingestWeeklyPool: jest.fn().mockResolvedValue(5),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EytController],
      providers: [
        { provide: EytService, useValue: eytServiceMock },
        { provide: ChallengeIntelligenceService, useValue: intelligenceMock },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(FeatureFlagGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<EytController>(EytController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /eyt/challenges/:id/stage1', () => {
    it('should submit stage 1 solution draft', async () => {
      const user = { sub: 'user-1', email: 'student@example.com', role: 'STUDENT' };
      const dto = { submittedAnswer: 'Draft solution', confidenceLevel: 'HIGH' as const };

      const result = await controller.submitStage1(user as any, 'ch-1', dto as any);
      expect(result.attemptId).toBe('att-1');
      expect(eytServiceMock.submitStage1).toHaveBeenCalledWith('user-1', 'ch-1', dto);
    });
  });

  describe('POST /eyt/attempts/:attemptId/stage2', () => {
    it('should submit stage 2 reflection and evaluate', async () => {
      const user = { sub: 'user-1', email: 'student@example.com', role: 'STUDENT' };
      const dto = { reflectionWhy: 'Tradeoff choice', reflectionAlternatives: 'Other options' };

      const result = await controller.submitStage2(user as any, 'att-1', dto as any);
      expect(result.xpGained).toBe(100);
      expect(eytServiceMock.submitStage2).toHaveBeenCalledWith('user-1', 'att-1', dto);
    });
  });
});
