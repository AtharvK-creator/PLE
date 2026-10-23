import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EytDifficulty } from '@prisma/client';

@Injectable()
export class EytRecommendationService {
  private readonly logger = new Logger(EytRecommendationService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Recalculates and updates the profile adaptive difficulty after every attempt
  async updateAdaptiveDifficulty(userId: string, latestScore: number): Promise<any> {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
    });
    if (!profile) return null;

    // Duolingo-style running rating update: weight the new score at 30%, old at 70%
    const currentScore = profile.adaptiveDifficultyScore;
    const newScore = Math.max(0, Math.min(100, currentScore * 0.7 + latestScore * 0.3));

    let recommendedDifficulty: EytDifficulty = EytDifficulty.EASY;
    let levelName = 'Beginner';

    if (newScore >= 90) {
      recommendedDifficulty = EytDifficulty.GRAND;
      levelName = 'Visionary';
    } else if (newScore >= 80) {
      recommendedDifficulty = EytDifficulty.EXPERT;
      levelName = 'Architect';
    } else if (newScore >= 65) {
      recommendedDifficulty = EytDifficulty.HARD;
      levelName = 'Systems Thinker';
    } else if (newScore >= 50) {
      recommendedDifficulty = EytDifficulty.MEDIUM;
      levelName = 'Analyst';
    }

    return await this.prisma.profile.update({
      where: { userId },
      data: {
        adaptiveDifficultyScore: newScore,
        recommendedDifficulty,
        adaptiveDifficultyLevel: levelName,
      },
    });
  }

  // Suggests the next 5 recommended challenges for a student
  async getRecommendations(userId: string, count = 5): Promise<any[]> {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
    });
    if (!profile) return [];

    // Find user's weakest Radar dimensions
    const dimensions = [
      { name: 'Logical Reasoning', score: profile.scoreLogicalReasoning },
      { name: 'Originality', score: profile.scoreOriginality },
      { name: 'Reflection', score: profile.scoreReflection },
      { name: 'Creativity', score: profile.scoreCreativity },
      { name: 'Decomposition', score: profile.scoreDecomposition },
      { name: 'Accuracy', score: profile.scoreAccuracy },
    ];
    dimensions.sort((a, b) => a.score - b.score);
    const weakestDimension = dimensions[0].name;

    // Fetch student's solved challenges to filter them out
    const attempts = await this.prisma.eytAttempt.findMany({
      where: { userId },
      select: { challengeId: true },
    });
    const solvedIds = new Set(attempts.map((a) => a.challengeId));

    // Get matching difficulty bounds
    const recDiff = profile.recommendedDifficulty;
    const allowedDifficulties: EytDifficulty[] = [recDiff];
    
    if (recDiff === EytDifficulty.EASY) {
      allowedDifficulties.push(EytDifficulty.MEDIUM);
    } else if (recDiff === EytDifficulty.MEDIUM) {
      allowedDifficulties.push(EytDifficulty.EASY);
      allowedDifficulties.push(EytDifficulty.HARD);
    } else if (recDiff === EytDifficulty.HARD) {
      allowedDifficulties.push(EytDifficulty.MEDIUM);
      allowedDifficulties.push(EytDifficulty.EXPERT);
    } else if (recDiff === EytDifficulty.EXPERT) {
      allowedDifficulties.push(EytDifficulty.HARD);
      allowedDifficulties.push(EytDifficulty.GRAND);
    }

    // Fetch all active published challenges
    const allChallenges = await this.prisma.eytChallenge.findMany({
      where: {
        isArchived: false,
        status: 'PUBLISHED',
      },
    });

    const candidates = allChallenges.filter((c) => !solvedIds.has(c.id));

    // Score and rank candidates
    const scoredCandidates = candidates.map((c) => {
      let score = 0;

      // 1. Weakest dimension match (XP weight)
      const testsWeakest = c.skillsTested.some((s) => s.toLowerCase().includes(weakestDimension.toLowerCase()));
      if (testsWeakest) score += 50;

      // 2. Difficulty align match
      if (allowedDifficulties.includes(c.difficulty)) score += 30;

      // 3. User interest match
      const careerGoal = (profile.careerGoal || '').toLowerCase();
      const matchesCareer = c.thinkingDomains.some((d) => careerGoal.includes(d.toLowerCase())) ||
                            c.industryTags.some((t) => careerGoal.includes(t.toLowerCase()));
      if (matchesCareer) score += 20;

      return { challenge: c, score };
    });

    scoredCandidates.sort((a, b) => b.score - a.score);

    return scoredCandidates.slice(0, count).map((sc) => ({
      id: sc.challenge.id,
      title: sc.challenge.title,
      category: sc.challenge.category,
      difficulty: sc.challenge.difficulty,
      xpReward: sc.challenge.xpReward,
      skillsTested: sc.challenge.skillsTested,
      recommendationScore: sc.score,
    }));
  }
}
