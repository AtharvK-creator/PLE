import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class EytAnalyticsService {
  private readonly logger = new Logger(EytAnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Recalculates and updates the student's dynamic Thinking DNA
  async updateThinkingDNA(userId: string): Promise<string> {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
    });
    if (!profile || profile.challengesSolved === 0) return 'Beginner Thinker';

    const scores = [
      { name: 'Logical Thinker', score: profile.scoreLogicalReasoning },
      { name: 'Innovation Thinker', score: profile.scoreOriginality },
      { name: 'Strategic Thinker', score: profile.scoreReflection },
      { name: 'Creative Thinker', score: profile.scoreCreativity },
      { name: 'Systems Thinker', score: profile.scoreDecomposition },
      { name: 'Analytical Thinker', score: profile.scoreAccuracy },
    ];

    // Compute standard deviation to check if they are a "Balanced Thinker"
    const mean = scores.reduce((acc, s) => acc + s.score, 0) / scores.length;
    const variance = scores.reduce((acc, s) => acc + Math.pow(s.score - mean, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);

    let dna = 'Balanced Thinker';
    if (stdDev >= 8) {
      // Pick highest score
      scores.sort((a, b) => b.score - a.score);
      dna = scores[0].name;
    }

    await this.prisma.profile.update({
      where: { userId },
      data: { thinkingDNA: dna },
    });

    return dna;
  }

  // Evaluates and appends milestones to the user's achievement timeline
  async updateTimeline(userId: string, latestScore: number, solvedCount: number, currentStreak: number): Promise<any[]> {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
    });
    if (!profile) return [];

    let currentTimeline: any[] = [];
    try {
      currentTimeline = typeof profile.achievementTimeline === 'string' 
        ? JSON.parse(profile.achievementTimeline) 
        : (profile.achievementTimeline as any[]) || [];
    } catch {
      currentTimeline = [];
    }

    const earnedMilestones = new Set(currentTimeline.map((item) => item.milestone));

    const checkAndAward = (milestone: string, description: string) => {
      if (!earnedMilestones.has(milestone)) {
        currentTimeline.push({
          milestone,
          description,
          earnedAt: new Date().toISOString(),
        });
      }
    };

    if (solvedCount >= 1) checkAndAward('First Challenge', 'Took the first step in the Thinking Lab.');
    if (latestScore >= 90) checkAndAward('First 90+ Score', 'Demonstrated exceptional reasoning clarity.');
    if (currentStreak >= 7) checkAndAward('7-Day Streak', 'Maintained cognitive training daily for a week.');
    if (currentStreak >= 30) checkAndAward('30-Day Streak', 'Locked in standard brain training for a month.');
    if (solvedCount >= 10) checkAndAward('Decathlon Solver', 'Completed 10 critical challenges.');
    if (solvedCount >= 50) checkAndAward('Elite Thinker', 'Completed 50 critical challenges.');
    if (solvedCount >= 100) checkAndAward('Centurion Mind', 'Completed 100 critical challenges in the Thinking Lab.');

    if (profile.thinkingLevel === 'Systems Thinker') {
      checkAndAward('Systems Thinker Badge', 'Levelled up to a Systems Thinker.');
    } else if (profile.thinkingLevel === 'Architect') {
      checkAndAward('Architect Level', 'Earned the Architect badge.');
    } else if (profile.thinkingLevel === 'Visionary') {
      checkAndAward('Visionary Mindset', 'Unlocked the final Visionary stage.');
    }

    await this.prisma.profile.update({
      where: { userId },
      data: { achievementTimeline: currentTimeline },
    });

    return currentTimeline;
  }

  // Generates Monthly Reports compiling student historical metrics
  async getMonthlyReport(userId: string, month: number, year: number): Promise<any> {
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59);

    const attempts = await this.prisma.eytAttempt.findMany({
      where: {
        userId,
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      include: {
        challenge: {
          select: { title: true, category: true, difficulty: true },
        },
      },
    });

    if (attempts.length === 0) {
      return {
        month,
        year,
        challengesSolved: 0,
        averageScore: 0,
        averageTimeMinutes: 0,
        totalXPEarned: 0,
        strengths: [],
        weaknesses: [],
        activityMap: {},
      };
    }

    const totalScore = attempts.reduce((acc, a) => acc + a.scoreOverall, 0);
    const totalTime = attempts.reduce((acc, a) => acc + a.thinkingTimeSeconds, 0);
    const averageScore = Math.round(totalScore / attempts.length);
    const averageTimeMinutes = Math.round((totalTime / attempts.length) / 60);

    // Sum overall skills dimensions
    let logical = 0, originality = 0, reflection = 0, creativity = 0, decomposition = 0, accuracy = 0;
    attempts.forEach((a) => {
      logical += a.scoreLogicalReasoning;
      originality += a.scoreOriginality;
      reflection += a.scoreReflection;
      creativity += a.scoreCreativity;
      decomposition += a.scoreDecomposition;
      accuracy += a.scoreAccuracy;
    });

    const dimensions = [
      { name: 'Logical Reasoning', score: Math.round(logical / attempts.length) },
      { name: 'Originality', score: Math.round(originality / attempts.length) },
      { name: 'Reflection Depth', score: Math.round(reflection / attempts.length) },
      { name: 'Creativity', score: Math.round(creativity / attempts.length) },
      { name: 'Problem Decomposition', score: Math.round(decomposition / attempts.length) },
      { name: 'Technical Accuracy', score: Math.round(accuracy / attempts.length) },
    ];

    dimensions.sort((a, b) => b.score - a.score);
    const strengths = dimensions.slice(0, 2).map((d) => d.name);
    const weaknesses = dimensions.slice(-2).map((d) => d.name);

    // Map daily contributions for a GitHub style contribution dashboard
    const activityMap: Record<string, number> = {};
    attempts.forEach((a) => {
      const dateStr = a.createdAt.toISOString().split('T')[0];
      activityMap[dateStr] = (activityMap[dateStr] || 0) + 1;
    });

    return {
      month,
      year,
      challengesSolved: attempts.length,
      averageScore,
      averageTimeMinutes,
      totalXPEarned: attempts.length * 150, // Standard weekly XP conversion
      strengths,
      weaknesses,
      activityMap,
    };
  }
}
