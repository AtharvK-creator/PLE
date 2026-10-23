import { Test, TestingModule } from '@nestjs/testing';
import { AIGatewayService } from './ai-gateway.service';
import { GeminiProvider } from './providers/gemini.provider';
import { GroqProvider } from './providers/groq.provider';
import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException } from '@nestjs/common';

describe('AIGatewayService (Unit)', () => {
  let service: AIGatewayService;
  let geminiMock: any;
  let groqMock: any;
  let configMock: any;

  beforeEach(async () => {
    geminiMock = {
      name: 'gemini',
      isAvailable: jest.fn().mockReturnValue(true),
      generate: jest.fn(),
      generateStream: jest.fn(),
    };

    groqMock = {
      name: 'groq',
      isAvailable: jest.fn().mockReturnValue(true),
      generate: jest.fn(),
      generateStream: jest.fn(),
    };

    configMock = {
      get: jest.fn().mockReturnValue('gemini'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIGatewayService,
        { provide: GeminiProvider, useValue: geminiMock },
        { provide: GroqProvider, useValue: groqMock },
        { provide: ConfigService, useValue: configMock },
      ],
    }).compile();

    service = module.get<AIGatewayService>(AIGatewayService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generate', () => {
    it('should return result from primary provider (Gemini)', async () => {
      geminiMock.generate.mockResolvedValue('Primary Gemini Response');

      const result = await service.generate('tutor', 'Explain OOP');
      expect(result.content).toBe('Primary Gemini Response');
      expect(result.provider).toBe('gemini');
      expect(geminiMock.generate).toHaveBeenCalled();
    });

    it('should fallback to Groq when Gemini fails', async () => {
      geminiMock.generate.mockRejectedValue(new Error('Gemini API Rate Limit Exceeded'));
      groqMock.generate.mockResolvedValue('Fallback Groq Response');

      const result = await service.generate('tutor', 'Explain OOP');
      expect(result.content).toBe('Fallback Groq Response');
      expect(result.provider).toBe('groq');
      expect(geminiMock.generate).toHaveBeenCalled();
      expect(groqMock.generate).toHaveBeenCalled();
    });

    it('should throw ServiceUnavailableException if all providers fail', async () => {
      geminiMock.generate.mockRejectedValue(new Error('Gemini Down'));
      groqMock.generate.mockRejectedValue(new Error('Groq Down'));

      await expect(service.generate('tutor', 'Explain OOP')).rejects.toThrow(
        ServiceUnavailableException,
      );
    });
  });

  describe('generateAndParseJSON', () => {
    it('should parse valid JSON response', async () => {
      geminiMock.generate.mockResolvedValue('{"quiz": "ok", "questions": []}');

      const result = await service.generateAndParseJSON<any>('quiz', 'Generate Quiz');
      expect(result.quiz).toBe('ok');
    });

    it('should strip markdown code blocks and parse JSON', async () => {
      geminiMock.generate.mockResolvedValue('```json\n{"quiz": "ok"}\n```');

      const result = await service.generateAndParseJSON<any>('quiz', 'Generate Quiz');
      expect(result.quiz).toBe('ok');
    });

    it('should extract JSON from surrounding text fallback', async () => {
      geminiMock.generate.mockResolvedValue('Here is your response:\n[{"id": 1}]\nHope this helps!');

      const result = await service.generateAndParseJSON<any[]>('quiz', 'Generate Quiz');
      expect(Array.isArray(result)).toBe(true);
      expect(result[0].id).toBe(1);
    });
  });
});
