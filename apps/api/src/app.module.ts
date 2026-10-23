import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { validateEnv } from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RoadmapModule } from './modules/roadmap/roadmap.module';
import { TutorModule } from './modules/tutor/tutor.module';
import { QuizModule } from './modules/quiz/quiz.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { FeatureFlagsModule } from './modules/feature-flags/feature-flags.module';
import { SkillsModule } from './modules/skills/skills.module';
import { LearningGoalsModule } from './modules/learning-goals/learning-goals.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { AIGatewayModule } from './modules/ai-gateway/ai-gateway.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { HealthModule } from './modules/health/health.module';
import { NewsModule } from './modules/news/news.module';
import { EytModule } from './modules/eyt/eyt.module';
import { IntelligenceModule } from './modules/intelligence/intelligence.module';

@Module({
  imports: [
    // Config with Zod validation
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),

    // Structured logging with Winston
    WinstonModule.forRoot({
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.ms(),
            winston.format.colorize({ all: true }),
            winston.format.printf(({ level, message, timestamp, ms, context, ...meta }) => {
              const ctx = context ? ` [${String(context)}]` : '';
              const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
              return `${String(timestamp)} ${String(ms)}${ctx} ${level}: ${String(message)}${metaStr}`;
            }),
          ),
        }),
        ...(process.env.NODE_ENV === 'production'
          ? [
              new winston.transports.Console({
                format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
              }),
            ]
          : []),
      ],
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        name: 'global',
        ttl: 60000,
        limit: 100,
      },
      {
        name: 'auth',
        ttl: 900000, // 15 minutes
        limit: 10,
      },
      {
        name: 'ai',
        ttl: 60000,
        limit: 20,
      },
    ]),

    // Core modules
    PrismaModule,
    HealthModule,

    // Feature modules
    AuthModule,
    UsersModule,
    RoadmapModule,
    TutorModule,
    QuizModule,
    DashboardModule,
    FeatureFlagsModule,
    SkillsModule,
    LearningGoalsModule,
    WebhooksModule,
    NewsModule,
    EytModule,
    IntelligenceModule,

    // Infrastructure modules
    AIGatewayModule,
    AnalyticsModule,
  ],
})
export class AppModule {}
