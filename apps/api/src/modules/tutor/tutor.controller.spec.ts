import { Test, TestingModule } from '@nestjs/testing';
import { TutorController } from './tutor.controller';
import { TutorService } from './tutor.service';
import { FeatureFlagGuard } from '../../common/guards/feature-flag.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ThrottlerGuard } from '@nestjs/throttler';

describe('TutorController (API Level)', () => {
  let controller: TutorController;
  let tutorServiceMock: any;

  beforeEach(async () => {
    tutorServiceMock = {
      createSession: jest.fn().mockResolvedValue({ id: 'sess-1', title: 'New Conversation' }),
      getSessions: jest.fn().mockResolvedValue([]),
      getSession: jest.fn().mockResolvedValue({ id: 'sess-1', messages: [] }),
      sendMessage: jest.fn().mockResolvedValue({
        id: 'msg-1',
        role: 'ASSISTANT',
        content: 'AI Tutor response',
      }),
      streamMessage: jest.fn().mockReturnValue(
        (async function* () {
          yield 'Chunk 1';
          yield 'Chunk 2';
        })(),
      ),
      deleteSession: jest.fn().mockResolvedValue({ message: 'Session deleted' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TutorController],
      providers: [{ provide: TutorService, useValue: tutorServiceMock }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(FeatureFlagGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TutorController>(TutorController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /tutor/sessions/:id/messages', () => {
    it('should send user message and return assistant message', async () => {
      const user = { sub: 'user-1', email: 'student@example.com', role: 'STUDENT' };
      const dto = { content: 'What is a stack?' };

      const result = await controller.sendMessage(user as any, 'sess-1', dto);
      expect(result.content).toBe('AI Tutor response');
      expect(tutorServiceMock.sendMessage).toHaveBeenCalledWith('user-1', 'sess-1', dto);
    });
  });

  describe('POST /tutor/sessions/:id/stream', () => {
    it('should stream AI response to Express response object', async () => {
      const user = { sub: 'user-1', email: 'student@example.com', role: 'STUDENT' };
      const dto = { content: 'Explain queue stream' };
      const resMock = {
        setHeader: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
      };

      await controller.streamMessage(user as any, 'sess-1', dto, resMock as any);
      expect(tutorServiceMock.streamMessage).toHaveBeenCalledWith('user-1', 'sess-1', dto);
      expect(resMock.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
      expect(resMock.end).toHaveBeenCalled();
    });
  });
});
