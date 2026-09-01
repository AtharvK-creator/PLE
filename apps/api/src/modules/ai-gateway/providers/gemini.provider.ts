import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { AITask } from '@ple/types';
import { IAIProvider } from './ai-provider.interface';
import { EnvConfig } from '../../../config/env.validation';

@Injectable()
export class GeminiProvider implements IAIProvider {
  readonly name = 'gemini';
  private readonly logger = new Logger(GeminiProvider.name);
  private readonly client: GoogleGenerativeAI;
  private readonly modelName: string;
  private readonly modelQuizName: string;

  constructor(private configService: ConfigService<EnvConfig>) {
    const apiKey = this.configService.get('GEMINI_API_KEY', { infer: true });
    if (!apiKey) throw new Error('GEMINI_API_KEY is required');
    this.client = new GoogleGenerativeAI(apiKey);
    this.modelName =
      this.configService.get('GEMINI_MODEL', { infer: true }) ?? 'gemini-1.5-flash';
    this.modelQuizName =
      this.configService.get('GEMINI_MODEL_QUIZ', { infer: true }) ?? 'gemini-1.5-flash';
  }

  private getModel(task: AITask, systemInstruction?: string): GenerativeModel {
    const modelName = task === 'quiz' ? this.modelQuizName : this.modelName;
    const config: any = { model: modelName };
    if (systemInstruction) {
      config.systemInstruction = { role: 'system', parts: [{ text: systemInstruction }] };
    }
    if (task === 'quiz' || task === 'eyt') {
      config.generationConfig = { responseMimeType: 'application/json' };
    }
    return this.client.getGenerativeModel(config);
  }

  isAvailable(): boolean {
    return !!this.configService.get('GEMINI_API_KEY', { infer: true });
  }

  async generate(task: AITask, prompt: string, systemPrompt?: string): Promise<string> {
    const model = this.getModel(task, systemPrompt);
    this.logger.debug(
      `Generating with Gemini (task: ${task}, model: ${task === 'quiz' ? this.modelQuizName : this.modelName})`,
    );
    const result = await model.generateContent(prompt);
    const response = result.response;
    return response.text();
  }

  async *generateStream(
    task: AITask,
    prompt: string,
    systemPrompt?: string,
    history?: Array<{ role: 'user' | 'model'; content: string }>,
    attachment?: { mimeType: string; base64Data: string },
  ): AsyncGenerator<string, void, unknown> {
    const model = this.getModel(task);
    const chatHistory = (history ?? []).map((h) => ({
      role: h.role,
      parts: [{ text: h.content }],
    }));

    const chat = model.startChat({
      history: chatHistory,
      systemInstruction: systemPrompt ? { role: 'system', parts: [{ text: systemPrompt }] } : undefined,
    });

    const contentParts: any[] = [];
    if (attachment) {
      contentParts.push({
        inlineData: {
          mimeType: attachment.mimeType,
          data: attachment.base64Data,
        },
      });
    }
    contentParts.push({ text: prompt });

    const result = await chat.sendMessageStream(contentParts);
    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) yield text;
    }
  }
}
