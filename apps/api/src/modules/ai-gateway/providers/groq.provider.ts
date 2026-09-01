import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';
import { AITask } from '@ple/types';
import { IAIProvider } from './ai-provider.interface';
import { EnvConfig } from '../../../config/env.validation';

@Injectable()
export class GroqProvider implements IAIProvider {
  readonly name = 'groq';
  private readonly logger = new Logger(GroqProvider.name);
  private client: Groq | null = null;
  private readonly modelName: string;
  private readonly modelQuizName: string;

  constructor(private configService: ConfigService<EnvConfig>) {
    const apiKey = this.configService.get('GROQ_API_KEY', { infer: true });
    if (apiKey) {
      this.client = new Groq({ apiKey });
    }
    this.modelName =
      this.configService.get('GROQ_MODEL', { infer: true }) ?? 'llama-3.3-70b-versatile';
    this.modelQuizName =
      this.configService.get('GROQ_MODEL_QUIZ', { infer: true }) ?? 'llama-3.1-8b-instant';
  }

  isAvailable(): boolean {
    return this.client !== null;
  }

  private getModelName(task: AITask): string {
    return task === 'quiz' ? this.modelQuizName : this.modelName;
  }

  async generate(task: AITask, prompt: string, systemPrompt?: string): Promise<string> {
    if (!this.client) throw new Error('Groq provider is not configured');
    const modelName = this.getModelName(task);
    this.logger.debug(`Generating with Groq (task: ${task}, model: ${modelName})`);

    const messages: Groq.Chat.ChatCompletionMessageParam[] = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    messages.push({ role: 'user', content: prompt });

    const config: any = {
      model: modelName,
      messages,
      temperature: 0.7,
      max_tokens: 8192,
    };
    if (task === 'quiz') {
      config.response_format = { type: 'json_object' };
    }

    const completion = await this.client.chat.completions.create(config);
    return completion.choices[0]?.message?.content ?? '';
  }

  async *generateStream(
    task: AITask,
    prompt: string,
    systemPrompt?: string,
    history?: Array<{ role: 'user' | 'model'; content: string }>,
    attachment?: { mimeType: string; base64Data: string },
  ): AsyncGenerator<string, void, unknown> {
    if (!this.client) throw new Error('Groq provider is not configured');
    const modelName = this.getModelName(task);

    const messages: Groq.Chat.ChatCompletionMessageParam[] = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    if (history) {
      for (const h of history) {
        messages.push({
          role: h.role === 'model' ? 'assistant' : 'user',
          content: h.content,
        });
      }
    }
    messages.push({ role: 'user', content: prompt });

    const stream = await this.client.chat.completions.create({
      model: modelName,
      messages,
      stream: true,
      temperature: 0.7,
      max_tokens: 8192,
    });
    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content ?? '';
      if (text) yield text;
    }
  }
}
