import { Test, TestingModule } from '@nestjs/testing';
import { QuizController } from './quiz.controller';
import { QuizService } from './quiz.service';
import { FeatureFlagGuard } from '../../common/guards/feature-flag.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

describe('QuizController (API Level)', () => {
  let controller: QuizController;
  let quizServiceMock: any;

  beforeEach(async () => {
    quizServiceMock = {
      generate: jest.fn().mockResolvedValue({
        id: 'quiz-1',
        topic: 'Algorithms',
        subject: 'CS',
        difficulty: 'MEDIUM',
        totalQuestions: 5,
      }),
      getQuizzes: jest.fn().mockResolvedValue([]),
      getAttempts: jest.fn().mockResolvedValue([]),
      getQuizById: jest.fn().mockResolvedValue({ id: 'quiz-1', topic: 'Algorithms' }),
      submitAttempt: jest.fn().mockResolvedValue({
        attemptId: 'att-1',
        score: 80,
        totalQuestions: 5,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuizController],
      providers: [{ provide: QuizService, useValue: quizServiceMock }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(FeatureFlagGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<QuizController>(QuizController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /quiz/generate', () => {
    it('should generate quiz for authenticated student', async () => {
      const user = { sub: 'user-1', email: 'student@example.com', role: 'STUDENT' };
      const dto = { topic: 'Algorithms', subject: 'CS', difficulty: 'MEDIUM' as const };

      const result = await controller.generate(user as any, dto);
      expect(result.id).toBe('quiz-1');
      expect(quizServiceMock.generate).toHaveBeenCalledWith('user-1', dto);
    });
  });

  describe('POST /quiz/:id/attempt', () => {
    it('should submit quiz attempt answers', async () => {
      const user = { sub: 'user-1', email: 'student@example.com', role: 'STUDENT' };
      const dto = { answers: [], timeTakenSeconds: 120 };

      const result = await controller.submitAttempt(user as any, 'quiz-1', dto as any);
      expect(result.score).toBe(80);
      expect(quizServiceMock.submitAttempt).toHaveBeenCalledWith('user-1', 'quiz-1', dto);
    });
  });
});
