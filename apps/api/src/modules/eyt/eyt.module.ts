import { Module } from '@nestjs/common';
import { EytService } from './eyt.service';
import { EytController } from './eyt.controller';
import { EytCollectionService, EytEnhancementService, ChallengeIntelligenceService } from './challenge-intelligence.service';
import { EytEvaluationService } from './eyt-evaluation.service';
import { EytRecommendationService } from './eyt-recommendation.service';
import { EytAnalyticsService } from './eyt-analytics.service';

@Module({
  providers: [
    EytService,
    EytCollectionService,
    EytEnhancementService,
    ChallengeIntelligenceService,
    EytEvaluationService,
    EytRecommendationService,
    EytAnalyticsService,
  ],
  controllers: [EytController],
  exports: [
    EytService,
    ChallengeIntelligenceService,
    EytRecommendationService,
    EytAnalyticsService,
  ],
})
export class EytModule {}
