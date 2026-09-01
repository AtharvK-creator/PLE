import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FeatureFlagName, FeatureFlagDto } from '@ple/types';

@Injectable()
export class FeatureFlagsService {
  private readonly logger = new Logger(FeatureFlagsService.name);
  private cache: Map<string, { value: boolean; expiresAt: number }> = new Map();
  private readonly cacheTtlMs = 60000; // 1 minute TTL

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Check if a feature flag is enabled. Results are cached for 1 minute.
   * Defaults to `true` (fail open) if the flag is missing from the DB.
   */
  async isEnabled(flagName: FeatureFlagName): Promise<boolean> {
    const cached = this.cache.get(flagName);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    try {
      const flag = await this.prisma.featureFlag.findUnique({
        where: { name: flagName },
      });
      const value = flag?.enabled ?? true; // default to enabled if not found
      this.cache.set(flagName, { value, expiresAt: Date.now() + this.cacheTtlMs });
      return value;
    } catch (err) {
      this.logger.error(`Failed to check feature flag ${flagName}:`, err);
      return true; // fail open
    }
  }

  /**
   * Return all feature flags from the database, sorted by name.
   */
  async getAll(): Promise<FeatureFlagDto[]> {
    const flags = await this.prisma.featureFlag.findMany({
      orderBy: { name: 'asc' },
    });
    return flags.map((f) => ({
      id: f.id,
      name: f.name,
      enabled: f.enabled,
      description: f.description ?? undefined,
      createdAt: f.createdAt.toISOString(),
      updatedAt: f.updatedAt.toISOString(),
    }));
  }

  /**
   * Invalidate the in-memory cache for a specific flag or all flags.
   */
  invalidateCache(flagName?: string): void {
    if (flagName) {
      this.cache.delete(flagName);
    } else {
      this.cache.clear();
    }
  }
}
