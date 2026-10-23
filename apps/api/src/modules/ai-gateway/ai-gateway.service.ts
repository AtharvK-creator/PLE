import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AITask, AIResponse, AIProvider } from '@ple/types';
import { GeminiProvider } from './providers/gemini.provider';
import { GroqProvider } from './providers/groq.provider';
import { IAIProvider } from './providers/ai-provider.interface';
import { EnvConfig } from '../../config/env.validation';

@Injectable()
export class AIGatewayService {
  private readonly logger = new Logger(AIGatewayService.name);
  private readonly primaryProvider: IAIProvider;
  private readonly fallbackProvider: IAIProvider | null;

  constructor(
    private readonly geminiProvider: GeminiProvider,
    private readonly groqProvider: GroqProvider,
    private readonly configService: ConfigService<EnvConfig>,
  ) {
    const providerName = this.configService.get('AI_PROVIDER', { infer: true }) ?? 'gemini';
    if (providerName === 'groq') {
      this.primaryProvider = groqProvider;
      this.fallbackProvider = geminiProvider.isAvailable() ? geminiProvider : null;
    } else {
      this.primaryProvider = geminiProvider;
      this.fallbackProvider = groqProvider.isAvailable() ? groqProvider : null;
    }
    this.logger.log(
      `AI Gateway initialized. Primary: ${this.primaryProvider.name}, Fallback: ${this.fallbackProvider?.name ?? 'none'}`,
    );
  }

  async generate(
    task: AITask,
    prompt: string,
    systemPrompt?: string,
    providerOverride?: string,
  ): Promise<AIResponse> {
    const providers: IAIProvider[] = [];

    if (providerOverride === 'groq') {
      if (this.groqProvider.isAvailable()) {
        providers.push(this.groqProvider);
      }
      providers.push(this.geminiProvider);
    } else if (providerOverride === 'gemini') {
      providers.push(this.geminiProvider);
    } else {
      providers.push(this.primaryProvider);
      if (this.fallbackProvider) {
        providers.push(this.fallbackProvider);
      }
    }

    let lastError: Error | null = null;
    for (const provider of providers) {
      try {
        this.logger.debug(`Attempting generation with ${provider.name} (task: ${task})`);
        const content = await provider.generate(task, prompt, systemPrompt);
        return {
          content,
          provider: provider.name as AIProvider,
          model: task === 'quiz' ? 'quiz-model' : 'default-model',
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.logger.warn(
          `Provider ${provider.name} failed: ${lastError.message}. Trying fallback...`,
        );
      }
    }

    throw new ServiceUnavailableException(
      `All AI providers failed. Last error: ${lastError?.message ?? 'Unknown error'}`,
    );
  }

  async *generateStream(
    task: AITask,
    prompt: string,
    systemPrompt?: string,
    history?: Array<{ role: 'user' | 'model'; content: string }>,
    providerOverride?: string,
    attachment?: { mimeType: string; base64Data: string },
  ): AsyncGenerator<string, void, unknown> {
    const providers: IAIProvider[] = [];

    if (providerOverride === 'groq') {
      if (this.groqProvider.isAvailable()) {
        providers.push(this.groqProvider);
      }
      providers.push(this.geminiProvider);
    } else if (providerOverride === 'gemini') {
      providers.push(this.geminiProvider);
    } else {
      providers.push(this.primaryProvider);
      if (this.fallbackProvider) {
        providers.push(this.fallbackProvider);
      }
    }

    let lastError: Error | null = null;
    let fallbackTriggered = false;

    for (const provider of providers) {
      try {
        this.logger.debug(`Attempting stream with ${provider.name} (task: ${task})`);

        if (fallbackTriggered) {
          yield `__SYSTEM_FALLBACK_PROVIDER__`;
        }

        const stream = provider.generateStream(task, prompt, systemPrompt, history, attachment);
        for await (const chunk of stream) {
          yield chunk;
        }
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.logger.warn(
          `Stream provider ${provider.name} failed: ${lastError.message}. Trying fallback...`,
        );
        fallbackTriggered = true;
      }
    }

    throw new ServiceUnavailableException(
      `All AI providers failed for streaming. Last error: ${lastError?.message ?? 'Unknown error'}`,
    );
  }

  async generateAndParseJSON<T>(
    task: AITask,
    prompt: string,
    systemPrompt?: string,
  ): Promise<T> {
    const response = await this.generate(task, prompt, systemPrompt);
    let content = response.content.trim();

    // Strip markdown code blocks if present (models sometimes wrap JSON in ```json ... ```)
    content = content.replace(/^```(?:json)?\s*/g, '').replace(/\s*```\s*$/g, '').trim();

    try {
      return JSON.parse(content) as T;
    } catch {
      // Secondary fallback: Extract first JSON object or array match from response text
      const jsonMatch = content.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[1]) as T;
        } catch {
          // ignore
        }
      }

      this.logger.error(
        `Failed to parse JSON response: ${content.substring(0, 200)}...`,
      );
      throw new Error('AI returned invalid JSON. Please try again.');
    }
  }
}
