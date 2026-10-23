import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PostHog } from 'posthog-node';
import { AnalyticsEvent, AnalyticsEventProperties } from '@ple/types';
import { EnvConfig } from '../../config/env.validation';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);
  private client: PostHog | null = null;

  constructor(private configService: ConfigService<EnvConfig>) {
    const key = this.configService.get('POSTHOG_KEY', { infer: true });
    const host = this.configService.get('POSTHOG_HOST', { infer: true });
    if (key) {
      this.client = new PostHog(key, {
        host: host ?? 'https://app.posthog.com',
        flushAt: 20,
        flushInterval: 10000,
      });
      this.logger.log('PostHog analytics initialized');
    } else {
      this.logger.warn('POSTHOG_KEY not set — analytics disabled');
    }
  }

  capture<E extends AnalyticsEvent>(
    userId: string,
    event: E,
    properties: AnalyticsEventProperties[E],
  ): void {
    if (!this.client) return;
    try {
      this.client.capture({
        distinctId: userId,
        event,
        properties: {
          ...properties,
          $set: { userId },
        },
      });
    } catch (err) {
      this.logger.error(`Failed to capture event ${event}:`, err);
    }
  }

  identify(userId: string, properties: Record<string, unknown>): void {
    if (!this.client) return;
    try {
      this.client.identify({
        distinctId: userId,
        properties,
      });
    } catch (err) {
      this.logger.error('Failed to identify user:', err);
    }
  }

  async shutdown(): Promise<void> {
    if (this.client) {
      await this.client.shutdown();
    }
  }
}
