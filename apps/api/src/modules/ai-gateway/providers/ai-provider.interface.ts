import { AITask } from '@ple/types';

export interface IAIProvider {
  readonly name: string;
  generate(task: AITask, prompt: string, systemPrompt?: string): Promise<string>;
  generateStream(
    task: AITask,
    prompt: string,
    systemPrompt?: string,
    history?: Array<{ role: 'user' | 'model'; content: string }>,
    attachment?: { mimeType: string; base64Data: string },
  ): AsyncGenerator<string, void, unknown>;
  isAvailable(): boolean;
}
