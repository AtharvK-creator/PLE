import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly dimension = 1536;

  constructor(private readonly configService: ConfigService) {}

  /**
   * Generates a 1536-dimensional embedding vector for input text.
   * Uses Google GenAI embedding API if key is present, otherwise fallback pseudo-vector generator.
   */
  async generateEmbedding(text: string): Promise<number[]> {
    if (!text || text.trim().length === 0) {
      return new Array(this.dimension).fill(0);
    }

    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (apiKey) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: 'models/text-embedding-004',
              content: { parts: [{ text: text.substring(0, 2048) }] },
            }),
          },
        );

        if (response.ok) {
          const data: any = await response.json();
          const rawValues: number[] = data.embedding?.values ?? [];
          if (rawValues.length > 0) {
            return this.normalizeAndPad(rawValues, this.dimension);
          }
        }
      } catch (err: any) {
        this.logger.warn(`Gemini Embedding API call failed: ${err.message}. Using deterministic fallback.`);
      }
    }

    return this.generateDeterministicVector(text, this.dimension);
  }

  /**
   * Normalizes vector length and pads/truncates to target dimension.
   */
  private normalizeAndPad(values: number[], targetDim: number): number[] {
    const result = new Array(targetDim).fill(0);
    for (let i = 0; i < Math.min(values.length, targetDim); i++) {
      result[i] = values[i];
    }
    const norm = Math.sqrt(result.reduce((sum, val) => sum + val * val, 0)) || 1;
    return result.map((val) => val / norm);
  }

  /**
   * Generates a deterministic normalized pseudo-embedding vector from string hash.
   */
  private generateDeterministicVector(text: string, dim: number): number[] {
    const vector = new Array(dim).fill(0);
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = (hash << 5) - hash + text.charCodeAt(i);
      hash |= 0;
    }

    for (let i = 0; i < dim; i++) {
      const seed = Math.sin(hash + i) * 10000;
      vector[i] = seed - Math.floor(seed);
    }

    const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0)) || 1;
    return vector.map((v) => v / norm);
  }
}
