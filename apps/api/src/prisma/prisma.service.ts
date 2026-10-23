import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import ws from 'ws';

// Assign WebSocket constructor for Node environment
neonConfig.webSocketConstructor = ws;

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private readonly pool: Pool;

  constructor(configService: ConfigService) {
    const url = configService.get<string>('DATABASE_URL') || process.env.DATABASE_URL || '';
    
    // Create Neon Serverless Pool (routes all queries over WebSocket / HTTPS Port 443)
    const pool = new Pool({ connectionString: url });
    const adapter = new PrismaNeon(pool);

    super({
      adapter,
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'stdout', level: 'info' },
        { emit: 'stdout', level: 'warn' },
        { emit: 'stdout', level: 'error' },
      ],
    });

    this.pool = pool;
    this.logger.log('PrismaService initialized with Neon Serverless Driver Adapter (WebSocket/HTTPS)');
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Prisma runtime connected successfully via Neon Driver Adapter');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Prisma initial connection pending: ${errorMsg}`);
    }

    // Log slow queries in development
    if (process.env.NODE_ENV !== 'production') {
      // @ts-expect-error: Prisma event typing
      this.$on('query', (e: { query: string; duration: number }) => {
        if (e.duration > 500) {
          this.logger.warn(`Slow query (${e.duration}ms): ${e.query}`);
        }
      });
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    await this.pool.end();
    this.logger.log('Database pool and Prisma connection closed');
  }
}
