import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AIGatewayService } from '../ai-gateway/ai-gateway.service';
import { buildEytEvaluationPrompt, buildEytSystemPrompt } from '../ai-gateway/prompts/eyt.prompt';
import { EytConfidenceLevel } from '@prisma/client';

@Injectable()
export class EytEvaluationService {
  private readonly logger = new Logger(EytEvaluationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiGateway: AIGatewayService
  ) {}

  // Run stage 2 evaluation: calls Gemini and computes authenticity and progressive penalties
  async evaluateAttempt(
    userId: string,
    challengeId: string,
    dto: {
      submittedAnswer: string;
      reflectionWhy: string;
      reflectionAlternatives: string;
      reflectionAssumptions: string;
      reflectionFailures: string;
      reflectionImprovement: string;
      reflectionTradeoffs: string;
      confidenceLevel: EytConfidenceLevel;
      thinkingTimeSeconds: number;
      hintsUsedCount: number;
      reflectionAfterSubmission: string;
    }
  ) {
    const challenge = await this.prisma.eytChallenge.findUnique({
      where: { id: challengeId },
    });
    if (!challenge) throw new Error('Challenge not found');

    const prompt = buildEytEvaluationPrompt({
      challengeTitle: challenge.title,
      challengeCategory: challenge.category,
      challengeDifficulty: challenge.difficulty,
      problemStatement: challenge.description,
      referenceSolution: challenge.referenceSolution,
      submittedAnswer: dto.submittedAnswer,
      reflectionWhy: dto.reflectionWhy,
      reflectionAlternatives: dto.reflectionAlternatives,
      reflectionAssumptions: dto.reflectionAssumptions,
      reflectionFailures: dto.reflectionFailures,
      reflectionImprovement: dto.reflectionImprovement,
      reflectionTradeoffs: dto.reflectionTradeoffs,
      confidenceLevel: dto.confidenceLevel,
      thinkingTimeSeconds: dto.thinkingTimeSeconds,
    });

    const systemPrompt = `${buildEytSystemPrompt()}
Additionally, you MUST evaluate the student's Grow Mindset and self-correction ability based on this post-submission reflection:
Reflection Question: "If you had one more attempt, what would you improve in your solution?"
Student's Reflection Answer: "${dto.reflectionAfterSubmission}"

Your output JSON must contain these additional keys:
1. "thinkingAuthenticityScore": Integer (0-100) representing how unique and human the student's reasoning style is.
2. "thinkingAuthenticityFeedback": A constructive feedback message (e.g. "Your reasoning resembles common AI-generated solution patterns. Try explaining more of your own reasoning process to improve your Thinking Authenticity Score.")
3. "scoreGrowthMindset": Integer (0-100) based on their post-submission reflection.
4. "scoreSelfCorrection": Integer (0-100) based on their post-submission reflection.
`;

    let result: any;
    try {
      result = await this.aiGateway.generateAndParseJSON<any>('eyt', prompt, systemPrompt);
    } catch (err) {
      this.logger.error('Gemini evaluation failed. Building fallback scores.', err);
      result = this.buildFallbackEvaluation(dto);
    }

    // 1. Calculate Confidence Calibration
    const confidenceVal = this.mapConfidenceToScore(dto.confidenceLevel);
    const calibrationError = Math.abs(confidenceVal - (result.scoreOverall || 60));
    const confidenceCalibrationScore = Math.max(0, 100 - calibrationError);

    // 2. Adjust Reflection score based on Growth Mindset & Self-Correction
    const growthMindset = result.scoreGrowthMindset ?? 70;
    const selfCorrection = result.scoreSelfCorrection ?? 70;
    const baseReflection = result.scoreReflection ?? 70;
    const adjustedReflection = Math.round((baseReflection * 0.5) + (growthMindset * 0.25) + (selfCorrection * 0.25));

    // 3. Weight scores
    const baseWeightedScore = 
      (result.scoreLogicalReasoning * 0.25) +
      (result.scoreOriginality * 0.20) +
      (result.scoreDecomposition * 0.20) +
      (result.scoreAccuracy * 0.15) +
      (result.scoreCreativity * 0.10) +
      (adjustedReflection * 0.10);

    // 4. Thinking Authenticity Calculation
    // Heuristic adjusts Gemini's authenticity score down if similarity is high or time is extremely low
    let computedAuthenticity = result.thinkingAuthenticityScore ?? 100;
    if (result.similarityPercent > 70) {
      computedAuthenticity = Math.max(0, computedAuthenticity - (result.similarityPercent - 70));
    }
    if (dto.thinkingTimeSeconds < 60) {
      computedAuthenticity = Math.max(0, computedAuthenticity - 30); // Penalty for rushing
    }
    const authenticityScore = Math.max(0, Math.min(100, Math.round(computedAuthenticity)));

    // Construct authenticity constructive feedback
    let authenticityFeedback = result.thinkingAuthenticityFeedback || 'Your reasoning is highly original.';
    if (authenticityScore < 60) {
      authenticityFeedback = 'Your reasoning resembles common AI-generated solution patterns. Try explaining more of your own reasoning process to improve your Thinking Authenticity Score.';
    }

    // Authenticity influences score slightly (5% weight)
    const calibrationPenalty = result.similarityPercent > 75 ? Math.min(10, (result.similarityPercent - 75) * 0.2) : 0;
    let scoreOverall = Math.max(0, Math.min(100, Math.round(baseWeightedScore * 0.9 + confidenceCalibrationScore * 0.05 + authenticityScore * 0.05 - calibrationPenalty)));

    // 5. Hint Penalties: Deduct 10% per hint used
    const hintPenaltyFactor = Math.max(0.7, 1 - (dto.hintsUsedCount * 0.10));
    scoreOverall = Math.round(scoreOverall * hintPenaltyFactor);

    let sustainedTimeBonus = 0;
    if (dto.thinkingTimeSeconds > 180) {
      sustainedTimeBonus = 50; 
    } else if (dto.thinkingTimeSeconds > 60) {
      sustainedTimeBonus = 25; 
    }

    const eytXPReward = Math.round((challenge.xpReward + sustainedTimeBonus) * hintPenaltyFactor);

    return {
      evaluation: {
        scoreLogicalReasoning: Math.round(result.scoreLogicalReasoning || 70),
        scoreOriginality: Math.round(result.scoreOriginality || 70),
        scoreDecomposition: Math.round(result.scoreDecomposition || 70),
        scoreAccuracy: Math.round(result.scoreAccuracy || 70),
        scoreCreativity: Math.round(result.scoreCreativity || 70),
        scoreReflection: adjustedReflection,
        scoreConfidenceCalibration: Math.round(confidenceCalibrationScore),
        scoreOverall,
        similarityPercent: Math.round(result.similarityPercent || 40),
        thinkingAuthenticityScore: authenticityScore,
        thinkingAuthenticityFeedback: authenticityFeedback,
        reasoningDifference: result.reasoningDifference || 'Formulated sequential logic checks.',
        feedbackOriginality: result.feedbackOriginality || 'Standard logic path.',
        feedbackStrengths: result.feedbackStrengths || 'Analyzed constraints correctly.',
        feedbackWeaknesses: result.feedbackWeaknesses || 'Consider analyzing corner-cases.',
        hiddenAssumptions: result.hiddenAssumptions || 'None identified.',
        alternativePerspective: result.alternativePerspective || 'Review alternate pathways.',
        industryPerspective: challenge.industrySolution,
        interviewPerspective: result.interviewPerspective || 'Pitch standard trade-offs.',
        learningResources: result.learningResources || [],
        nextRecommendedChallengeId: result.nextRecommendedChallengeId || null,
      },
      xpGained: eytXPReward,
    };
  }

  private mapConfidenceToScore(level: EytConfidenceLevel): number {
    switch (level) {
      case EytConfidenceLevel.VERY_LOW: return 10;
      case EytConfidenceLevel.LOW: return 30;
      case EytConfidenceLevel.MEDIUM: return 50;
      case EytConfidenceLevel.HIGH: return 70;
      case EytConfidenceLevel.VERY_HIGH: return 90;
      default: return 50;
    }
  }

  private buildFallbackEvaluation(dto: any) {
    const len = dto.submittedAnswer.length;
    const score = Math.min(100, 50 + Math.min(30, len / 20));
    return {
      scoreLogicalReasoning: score,
      scoreOriginality: score,
      scoreDecomposition: 65,
      scoreAccuracy: 70,
      scoreCreativity: 60,
      scoreReflection: 65,
      similarityPercent: 35,
      thinkingAuthenticityScore: 85,
      thinkingAuthenticityFeedback: 'Strong independent thinking shown.',
      scoreGrowthMindset: 75,
      scoreSelfCorrection: 70,
    };
  }
}
