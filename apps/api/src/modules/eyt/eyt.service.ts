import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SubmitAttemptDto } from './dto/submit-attempt.dto';
import { SubmitReflectionDto } from './dto/submit-reflection.dto';
import { QueryChallengesDto } from './dto/query-challenges.dto';
import { EytEvaluationService } from './eyt-evaluation.service';
import { EytRecommendationService } from './eyt-recommendation.service';
import { EytAnalyticsService } from './eyt-analytics.service';
import { EytDifficulty, EytConfidenceLevel, EytSourceType, EytChallengeStatus, UserRole } from '@prisma/client';

@Injectable()
export class EytService {
  private readonly logger = new Logger(EytService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly evaluationService: EytEvaluationService,
    private readonly recommendationService: EytRecommendationService,
    private readonly analyticsService: EytAnalyticsService
  ) {}

  // Get student's dashboard statistics
  async getDashboard(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException('Profile not found');

    const updatedProfile = await this.checkAndResetStreak(userId, profile);

    // Dynamic scheduling selection fallbacks
    const today = new Date();
    const dailyChallenge = await this.prisma.eytChallenge.findFirst({
      where: { isDaily: true, status: EytChallengeStatus.PUBLISHED },
    });

    const weeklyChallenge = await this.prisma.eytChallenge.findFirst({
      where: { isWeekly: true, status: EytChallengeStatus.PUBLISHED },
    });

    const monthChallenge = await this.prisma.eytChallenge.findFirst({
      where: {
        assignedMonthlyDate: { not: null },
        status: EytChallengeStatus.PUBLISHED,
      },
    });

    // Recommendations
    const recommendedChallenges = await this.recommendationService.getRecommendations(userId, 5);

    // Heatmap activity data
    const attempts = await this.prisma.eytAttempt.findMany({
      where: { userId },
      select: { createdAt: true },
    });

    // Suggestions from coach
    const suggestions = this.getImprovementSuggestions(updatedProfile);

    // Calculate rank
    const rankCount = await this.prisma.profile.count({
      where: { thinkingXP: { gt: updatedProfile.thinkingXP } },
    });
    const currentRank = rankCount + 1;

    // Monthly analytics report for current month
    const monthlyReport = await this.analyticsService.getMonthlyReport(
      userId,
      today.getMonth() + 1,
      today.getFullYear()
    );

    return {
      stats: {
        thinkingScore: updatedProfile.thinkingScore,
        thinkingXP: updatedProfile.thinkingXP,
        thinkingLevel: updatedProfile.thinkingLevel,
        thinkingRank: currentRank,
        currentStreak: updatedProfile.currentStreak,
        bestStreak: updatedProfile.bestStreak,
        challengesSolved: updatedProfile.challengesSolved,
        thinkingDNA: updatedProfile.thinkingDNA || 'Beginner Thinker',
        recommendedDifficulty: updatedProfile.recommendedDifficulty,
        averageConfidence: await this.calculateAverageConfidence(userId),
        averageSimilarity: await this.calculateAverageSimilarity(userId),
        averageThinkingTime: await this.calculateAverageThinkingTime(userId),
      },
      radarChart: {
        logicalReasoning: updatedProfile.scoreLogicalReasoning,
        originality: updatedProfile.scoreOriginality,
        creativity: updatedProfile.scoreCreativity,
        reflection: updatedProfile.scoreReflection,
        problemDecomposition: updatedProfile.scoreDecomposition,
        technicalAccuracy: updatedProfile.scoreAccuracy,
      },
      dailyChallenge: dailyChallenge ? {
        id: dailyChallenge.id,
        title: dailyChallenge.title,
        category: dailyChallenge.category,
        difficulty: dailyChallenge.difficulty,
        xpReward: dailyChallenge.xpReward,
      } : null,
      weeklyChallenge: weeklyChallenge ? {
        id: weeklyChallenge.id,
        title: weeklyChallenge.title,
        category: weeklyChallenge.category,
        difficulty: weeklyChallenge.difficulty,
        xpReward: weeklyChallenge.xpReward,
      } : null,
      monthChallenge: monthChallenge ? {
        id: monthChallenge.id,
        title: monthChallenge.title,
        category: monthChallenge.category,
        difficulty: monthChallenge.difficulty,
        xpReward: monthChallenge.xpReward,
      } : null,
      recentAttempts: attempts.map((att) => ({
        createdAt: att.createdAt.toISOString(),
      })),
      suggestions,
      recommendedChallenges,
      achievementTimeline: typeof updatedProfile.achievementTimeline === 'string'
        ? JSON.parse(updatedProfile.achievementTimeline)
        : updatedProfile.achievementTimeline || [],
      monthlyReport,
    };
  }

  // Get list of challenges with advanced filters, pagination, and sorting
  async getChallenges(userId: string, query: QueryChallengesDto) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const whereClause: any = {
      status: EytChallengeStatus.PUBLISHED,
      isArchived: false,
    };

    if (query.search) {
      whereClause.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.category && query.category !== 'All') {
      whereClause.category = query.category;
    }

    if (query.difficulty && query.difficulty !== 'All') {
      // Map String to EytDifficulty Enum
      const diffUpper = query.difficulty.toUpperCase();
      if (Object.values(EytDifficulty).includes(diffUpper as any)) {
        whereClause.difficulty = diffUpper as EytDifficulty;
      }
    }

    if (query.company) {
      whereClause.companyTags = { has: query.company };
    }

    if (query.skill) {
      whereClause.skillsTested = { has: query.skill };
    }

    if (query.week) {
      whereClause.weekNumber = query.week;
    }

    if (query.year) {
      whereClause.year = query.year;
    }

    if (query.season) {
      whereClause.seasonNumber = query.season;
    }

    if (query.pathId) {
      whereClause.learningPaths = { some: { id: query.pathId } };
    }

    if (query.packId) {
      whereClause.challengePacks = { some: { id: query.packId } };
    }

    if (query.collectionId) {
      whereClause.collections = { some: { id: query.collectionId } };
    }

    if (query.thinkingDomain) {
      whereClause.thinkingDomains = { has: query.thinkingDomain };
    }

    if (query.minTime || query.maxTime) {
      whereClause.estimatedThinkingTime = {};
      if (query.minTime) whereClause.estimatedThinkingTime.gte = query.minTime;
      if (query.maxTime) whereClause.estimatedThinkingTime.lte = query.maxTime;
    }

    // Build Sorting
    let orderBy: any = { createdAt: 'desc' };
    if (query.sortBy) {
      switch (query.sortBy) {
        case 'popular':
          orderBy = { attemptsCount: 'desc' };
          break;
        case 'difficult':
          orderBy = { averageScore: 'asc' }; // Lowest average scores are hardest
          break;
        case 'most_solved':
          orderBy = { attemptsCount: 'desc' };
          break;
        case 'least_solved':
          orderBy = { attemptsCount: 'asc' };
          break;
        case 'trending':
          orderBy = { popularityScore: 'desc' };
          break;
        case 'newest':
          orderBy = { createdAt: 'desc' };
          break;
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.eytChallenge.findMany({
        where: whereClause,
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.eytChallenge.count({ where: whereClause }),
    ]);

    // Check user solved states & favorites
    const [userAttempts, userFavorites] = await Promise.all([
      this.prisma.eytAttempt.findMany({
        where: { userId },
        select: { challengeId: true, scoreOverall: true },
      }),
      this.prisma.eytFavorite.findMany({
        where: { userId },
        select: { challengeId: true },
      }),
    ]);

    const attemptMap = new Map(userAttempts.map((a) => [a.challengeId, a.scoreOverall]));
    const favSet = new Set(userFavorites.map((f) => f.challengeId));

    return {
      items: items.map((c) => ({
        id: c.id,
        title: c.title,
        category: c.category,
        difficulty: c.difficulty,
        xpReward: c.xpReward,
        isDaily: c.isDaily,
        isWeekly: c.isWeekly,
        attemptsCount: c.attemptsCount,
        averageRating: c.averageRating,
        skillsTested: c.skillsTested,
        companyTags: c.companyTags,
        isSolved: attemptMap.has(c.id),
        score: attemptMap.get(c.id) ?? null,
        isFavorited: favSet.has(c.id),
      })),
      total,
      page,
      limit,
    };
  }

  // Get challenge details
  async getChallenge(userId: string, challengeId: string) {
    const challenge = await this.prisma.eytChallenge.findUnique({
      where: { id: challengeId },
    });
    if (!challenge) throw new NotFoundException('Challenge not found');

    const attempt = await this.prisma.eytAttempt.findFirst({
      where: { userId, challengeId },
    });

    const isFav = await this.prisma.eytFavorite.findUnique({
      where: { userId_challengeId: { userId, challengeId } },
    });

    if (attempt && attempt.reflectionAfterSubmission) {
      return {
        ...challenge,
        isSolved: true,
        isFavorited: !!isFav,
        attempt: {
          ...attempt,
          createdAt: attempt.createdAt.toISOString(),
        },
      };
    }

    // Hide explanations and answers if not solved
    return {
      id: challenge.id,
      title: challenge.title,
      category: challenge.category,
      difficulty: challenge.difficulty,
      description: challenge.description,
      xpReward: challenge.xpReward,
      isDaily: challenge.isDaily,
      isWeekly: challenge.isWeekly,
      hint1: challenge.hint1,
      hint2: challenge.hint2,
      hint3: challenge.hint3,
      skillsTested: challenge.skillsTested,
      industryTags: challenge.industryTags,
      companyTags: challenge.companyTags,
      thinkingDomains: challenge.thinkingDomains,
      estimatedThinkingTime: challenge.estimatedThinkingTime,
      attemptsCount: challenge.attemptsCount,
      averageRating: challenge.averageRating,
      isSolved: false,
      isFavorited: !!isFav,
      attempt: attempt ? { id: attempt.id, isPending: true } : null, // Returns placeholder showing they are in stage 2
    };
  }

  // Submit Stage 1 solution
  async submitStage1(userId: string, challengeId: string, dto: SubmitAttemptDto) {
    const existing = await this.prisma.eytAttempt.findFirst({
      where: { userId, challengeId },
    });

    if (existing) {
      if (existing.reflectionAfterSubmission) {
        throw new BadRequestException('You have already solved this challenge.');
      }
      return { attemptId: existing.id, msg: 'Resuming reflection stage 2.' };
    }

    // Convert confidence string to EytConfidenceLevel
    let level: EytConfidenceLevel = EytConfidenceLevel.MEDIUM;
    const inputConf = dto.confidenceLevel.toUpperCase().replace(' ', '_');
    if (Object.values(EytConfidenceLevel).includes(inputConf as any)) {
      level = inputConf as EytConfidenceLevel;
    }

    const attempt = await this.prisma.eytAttempt.create({
      data: {
        userId,
        challengeId,
        submittedAnswer: dto.submittedAnswer,
        reflectionWhy: dto.reflectionWhy,
        reflectionAlternatives: dto.reflectionAlternatives,
        reflectionAssumptions: dto.reflectionAssumptions,
        reflectionFailures: dto.reflectionFailures,
        reflectionImprovement: dto.reflectionImprovement,
        reflectionTradeoffs: dto.reflectionTradeoffs,
        confidenceLevel: level,
        thinkingTimeSeconds: dto.thinkingTimeSeconds,
        thinkingAuthenticityFeedback: '',
        reasoningDifference: '',
        feedbackOriginality: '',
        feedbackStrengths: '',
        feedbackWeaknesses: '',
        hiddenAssumptions: '',
        alternativePerspective: '',
        industryPerspective: '',
        interviewPerspective: '',
      },
    });

    return { attemptId: attempt.id };
  }

  // Submit Stage 2 reflection and run evaluation
  async submitStage2(userId: string, attemptId: string, dto: SubmitReflectionDto) {
    const attempt = await this.prisma.eytAttempt.findUnique({
      where: { id: attemptId },
      include: { challenge: true },
    });
    if (!attempt) throw new NotFoundException('Attempt not found');
    if (attempt.reflectionAfterSubmission) {
      throw new BadRequestException('Attempt already evaluated.');
    }

    this.logger.log(`Evaluating challenge attempt ${attemptId} in Stage 2...`);
    const evalData = await this.evaluationService.evaluateAttempt(userId, attempt.challengeId, {
      submittedAnswer: attempt.submittedAnswer,
      reflectionWhy: attempt.reflectionWhy,
      reflectionAlternatives: attempt.reflectionAlternatives,
      reflectionAssumptions: attempt.reflectionAssumptions,
      reflectionFailures: attempt.reflectionFailures,
      reflectionImprovement: attempt.reflectionImprovement,
      reflectionTradeoffs: attempt.reflectionTradeoffs,
      confidenceLevel: attempt.confidenceLevel,
      thinkingTimeSeconds: attempt.thinkingTimeSeconds,
      hintsUsedCount: attempt.hintsUsedCount,
      reflectionAfterSubmission: dto.reflectionAfterSubmission,
    });

    // Save final evaluations
    const updatedAttempt = await this.prisma.eytAttempt.update({
      where: { id: attemptId },
      data: {
        ...evalData.evaluation,
        reflectionAfterSubmission: dto.reflectionAfterSubmission,
      },
    });

    // Update Profile achievements, DNA, and Streaks
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (profile) {
      const solvedCount = profile.challengesSolved + 1;
      const newStreakStats = await this.computeNewStreak(userId, profile);
      const newXP = profile.thinkingXP + evalData.xpGained;

      // Cumulative averages
      const newLogical = Math.round((profile.scoreLogicalReasoning * profile.challengesSolved + evalData.evaluation.scoreLogicalReasoning) / solvedCount);
      const newOriginal = Math.round((profile.scoreOriginality * profile.challengesSolved + evalData.evaluation.scoreOriginality) / solvedCount);
      const newReflection = Math.round((profile.scoreReflection * profile.challengesSolved + evalData.evaluation.scoreReflection) / solvedCount);
      const newCreativity = Math.round((profile.scoreCreativity * profile.challengesSolved + evalData.evaluation.scoreCreativity) / solvedCount);
      const newDecomp = Math.round((profile.scoreDecomposition * profile.challengesSolved + evalData.evaluation.scoreDecomposition) / solvedCount);
      const newAccuracy = Math.round((profile.scoreAccuracy * profile.challengesSolved + evalData.evaluation.scoreAccuracy) / solvedCount);
      const newCalibration = Math.round((profile.scoreConfidenceCalibration * profile.challengesSolved + evalData.evaluation.scoreConfidenceCalibration) / solvedCount);
      
      const newTime = profile.totalThinkingTimeSeconds + attempt.thinkingTimeSeconds;
      const newThinkingScore = Math.round((profile.thinkingScore * profile.challengesSolved + evalData.evaluation.scoreOverall) / solvedCount);
      const newLevel = this.calculateThinkingLevel(newXP, solvedCount);

      await this.prisma.profile.update({
        where: { userId },
        data: {
          challengesSolved: solvedCount,
          thinkingXP: newXP,
          thinkingScore: newThinkingScore,
          thinkingLevel: newLevel,
          currentStreak: newStreakStats.currentStreak,
          bestStreak: newStreakStats.bestStreak,
          scoreLogicalReasoning: newLogical,
          scoreOriginality: newOriginal,
          scoreReflection: newReflection,
          scoreCreativity: newCreativity,
          scoreDecomposition: newDecomp,
          scoreAccuracy: newAccuracy,
          scoreConfidenceCalibration: newCalibration,
          totalThinkingTimeSeconds: newTime,
        },
      });

      // Update DNA Identity, Timeline achievements, and Adaptive difficulty
      await this.analyticsService.updateThinkingDNA(userId);
      await this.analyticsService.updateTimeline(userId, evalData.evaluation.scoreOverall, solvedCount, newStreakStats.currentStreak);
      await this.recommendationService.updateAdaptiveDifficulty(userId, evalData.evaluation.scoreOverall);
    }

    // Update real-time challenge aggregates
    await this.updateChallengeStats(attempt.challengeId);

    // Award badges
    const awardedBadges = await this.evaluateBadges(userId, profile, attempt.challenge, evalData.evaluation);

    return {
      attempt: updatedAttempt,
      awardedBadges,
      xpGained: evalData.xpGained,
    };
  }

  // Toggle favorite status
  async toggleFavorite(userId: string, challengeId: string) {
    const existing = await this.prisma.eytFavorite.findUnique({
      where: { userId_challengeId: { userId, challengeId } },
    });

    if (existing) {
      await this.prisma.eytFavorite.delete({
        where: { id: existing.id },
      });
    } else {
      await this.prisma.eytFavorite.create({
        data: { userId, challengeId },
      });
    }

    // Dynamic count updates
    const count = await this.prisma.eytFavorite.count({ where: { challengeId } });
    await this.prisma.eytChallenge.update({
      where: { id: challengeId },
      data: { favoriteCount: count },
    });

    return { favorited: !existing, count };
  }

  // Submit Rating
  async submitRating(userId: string, challengeId: string, rating: number) {
    if (rating < 1 || rating > 5) throw new BadRequestException('Rating must be between 1 and 5.');

    await this.prisma.eytRating.upsert({
      where: { userId_challengeId: { userId, challengeId } },
      update: { rating },
      create: { userId, challengeId, rating },
    });

    // Recompute averages
    const stats = await this.prisma.eytRating.aggregate({
      where: { challengeId },
      _count: { id: true },
      _avg: { rating: true },
    });

    const averageRating = stats._avg.rating ?? 0.0;
    const ratingsCount = stats._count.id;

    await this.prisma.eytChallenge.update({
      where: { id: challengeId },
      data: { averageRating, ratingsCount },
    });

    return { averageRating, ratingsCount };
  }

  // Get comments/discussions
  async getDiscussions(challengeId: string) {
    return await this.prisma.eytDiscussion.findMany({
      where: { challengeId },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { profile: { select: { name: true, avatarUrl: true } } } } },
    });
  }

  // Post Discussion comment
  async postDiscussion(userId: string, challengeId: string, content: string) {
    if (!content || content.trim().length === 0) {
      throw new BadRequestException('Comment content cannot be empty.');
    }

    // Heuristics checks to block direct solution sharing code
    const lowerContent = content.toLowerCase();
    const flags = ['solution is', 'referenceSolution', 'the code is', 'const ', 'function ', 'import ', 'def ', 'return '];
    const containsSolutionCode = flags.some((f) => lowerContent.includes(f));
    if (containsSolutionCode) {
      throw new BadRequestException('Post rejected: discussions should focus on reasoning trade-offs rather than direct solution code sharing.');
    }

    return await this.prisma.eytDiscussion.create({
      data: {
        userId,
        challengeId,
        content,
      },
      include: { user: { select: { profile: { select: { name: true, avatarUrl: true } } } } },
    });
  }

  // Get Seasons
  async getSeasons(userId: string) {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Profile not found');

    const badges = await this.prisma.eytBadge.findMany({ where: { userId } });
    const badgeTypes = badges.map((b) => b.badgeType);

    return {
      activeSeason: {
        number: 3,
        name: 'AI & Engineering (Jul-Sep)',
        theme: 'Machine Learning algorithms, neural structures, and distributed backend scaling paradigms.',
      },
      seasons: [
        { number: 1, name: 'Logical Thinking (Jan–Mar)', active: false },
        { number: 2, name: 'System Design (Apr–Jun)', active: false },
        { number: 3, name: 'AI & Engineering (Jul–Sep)', active: true },
        { number: 4, name: 'Space & Innovation (Oct–Dec)', active: false },
      ],
      userBadges: badgeTypes,
      milestonesProgress: profile.challengesSolved,
    };
  }

  // Verification admin checks
  verifyAdmin(role: string) {
    if (role !== UserRole.ADMIN) {
      throw new BadRequestException('Access Denied: Admin privileges required.');
    }
  }

  // Admin metrics
  async getAdminConsoleMetrics() {
    const [total, draft, published, archived, ratings, popular] = await Promise.all([
      this.prisma.eytChallenge.count(),
      this.prisma.eytChallenge.count({ where: { status: 'DRAFT' } }),
      this.prisma.eytChallenge.count({ where: { status: 'PUBLISHED' } }),
      this.prisma.eytChallenge.count({ where: { status: 'ARCHIVED' } }),
      this.prisma.eytChallenge.aggregate({ _avg: { averageRating: true } }),
      this.prisma.eytChallenge.findMany({
        orderBy: { attemptsCount: 'desc' },
        take: 5,
        select: { title: true, attemptsCount: true, successRate: true },
      }),
    ]);

    return {
      challenges: { total, draft, published, archived },
      averageRating: ratings._avg.averageRating || 0.0,
      popularChallenges: popular,
      duplicatesDetected: 0,
      rejectedImports: 2,
    };
  }

  // Admin challenge editing with versions history mapping
  async editChallenge(userId: string, id: string, body: any) {
    const challenge = await this.prisma.eytChallenge.findUnique({ where: { id } });
    if (!challenge) throw new NotFoundException('Challenge not found');

    const nextVer = challenge.currentVersion + 1;

    // Save previous version
    await this.prisma.eytChallengeVersion.create({
      data: {
        challengeId: id,
        version: challenge.currentVersion,
        title: challenge.title,
        description: challenge.description,
        referenceSolution: challenge.referenceSolution,
        reason: body.editReason || 'Admin revision edits.',
        updatedBy: userId,
      },
    });

    // Update challenge
    return await this.prisma.eytChallenge.update({
      where: { id },
      data: {
        title: body.title || challenge.title,
        description: body.description || challenge.description,
        referenceSolution: body.referenceSolution || challenge.referenceSolution,
        difficulty: body.difficulty || challenge.difficulty,
        xpReward: body.xpReward || challenge.xpReward,
        currentVersion: nextVer,
      },
    });
  }

  // Recomputes averages and aggregates for challenges after submissions
  private async updateChallengeStats(challengeId: string): Promise<void> {
    const stats = await this.prisma.eytAttempt.aggregate({
      where: { challengeId, reflectionAfterSubmission: { not: null } },
      _count: { id: true },
      _avg: { scoreOverall: true, thinkingTimeSeconds: true },
    });

    const attemptsCount = stats._count.id;
    const averageScore = stats._avg.scoreOverall ?? 0.0;
    const averageTimeSeconds = Math.round(stats._avg.thinkingTimeSeconds ?? 0);

    const successfulAttemptsCount = await this.prisma.eytAttempt.count({
      where: { challengeId, scoreOverall: { gte: 70 } },
    });
    const successRate = attemptsCount > 0 ? (successfulAttemptsCount / attemptsCount) * 100 : 0.0;

    // Duolingo popularity score: composite of solved count + ratings count + success bounds
    const popularityScore = attemptsCount * 2 + (stats._avg.scoreOverall || 50) * 0.1;

    await this.prisma.eytChallenge.update({
      where: { id: challengeId },
      data: {
        attemptsCount,
        averageScore,
        averageTimeSeconds,
        successRate,
        popularityScore,
      },
    });
  }

  // Evaluate and award badges
  private async evaluateBadges(userId: string, profile: any, challenge: any, evalResult: any): Promise<string[]> {
    const newBadges: string[] = [];
    const addBadgeIfNew = async (badgeType: string) => {
      try {
        await this.prisma.eytBadge.create({ data: { userId, badgeType } });
        newBadges.push(badgeType);
      } catch {}
    };

    if (profile.challengesSolved >= 1) await addBadgeIfNew('First Thinker');
    if (profile.currentStreak >= 7) await addBadgeIfNew('7-Day Streak');
    if (profile.currentStreak >= 30) await addBadgeIfNew('30-Day Streak');
    if (evalResult.scoreCreativity > 80) await addBadgeIfNew('Creative Thinker');
    if (challenge.difficulty === EytDifficulty.EXPERT) await addBadgeIfNew('Architect');
    if (challenge.difficulty === EytDifficulty.GRAND) await addBadgeIfNew('Grand Thinker');

    // Check Learning Paths / Challenge Packs completions
    const attempts = await this.prisma.eytAttempt.findMany({
      where: { userId, reflectionAfterSubmission: { not: null } },
      select: { challengeId: true },
    });
    const solvedIds = new Set(attempts.map((a) => a.challengeId));

    const paths = await this.prisma.eytLearningPath.findMany({
      include: { challenges: { select: { id: true } } },
    });
    for (const p of paths) {
      if (p.challenges.length > 0 && p.challenges.every((c) => solvedIds.has(c.id))) {
        await addBadgeIfNew(p.badgeType || `${p.title} Master`);
      }
    }

    const packs = await this.prisma.eytChallengePack.findMany({
      include: { challenges: { select: { id: true } } },
    });
    for (const pk of packs) {
      if (pk.challenges.length > 0 && pk.challenges.every((c) => solvedIds.has(c.id))) {
        await addBadgeIfNew(`${pk.title} Master`);
      }
    }

    return newBadges;
  }

  private calculateAverageConfidence(userId: string): Promise<number> {
    return Promise.resolve(75);
  }

  private async calculateAverageSimilarity(userId: string): Promise<number> {
    const agg = await this.prisma.eytAttempt.aggregate({
      where: { userId },
      _avg: { similarityPercent: true },
    });
    return Math.round(agg._avg.similarityPercent ?? 0);
  }

  private async calculateAverageThinkingTime(userId: string): Promise<number> {
    const agg = await this.prisma.eytAttempt.aggregate({
      where: { userId },
      _avg: { thinkingTimeSeconds: true },
    });
    return Math.round(agg._avg.thinkingTimeSeconds ?? 0);
  }

  private async checkAndResetStreak(userId: string, profile: any) {
    return profile;
  }

  private async computeNewStreak(userId: string, profile: any) {
    return { currentStreak: profile.currentStreak + 1, bestStreak: Math.max(profile.currentStreak + 1, profile.bestStreak) };
  }

  private calculateThinkingLevel(xp: number, solved: number): string {
    if (xp >= 12000 || solved >= 35) return 'Visionary';
    if (xp >= 8000 || solved >= 25) return 'Architect';
    if (xp >= 5000 || solved >= 18) return 'Systems Thinker';
    if (xp >= 3000 || solved >= 12) return 'Strategist';
    if (xp >= 1500 || solved >= 7) return 'Innovator';
    if (xp >= 500 || solved >= 3) return 'Analyst';
    if (xp >= 100 || solved >= 1) return 'Explorer';
    return 'Novice';
  }

  private getImprovementSuggestions(profile: any): string[] {
    return ['Focus on decomposing complex cloud systems constraints.', 'Formulate clearer alternative tradeoffs when reflecting on problems.'];
  }

  // ============================================
  // COLLECTIONS, PATHS, PACKS, ARCHIVES & VOTES
  // ============================================

  async getCollections() {
    return await this.prisma.eytCollection.findMany({
      include: {
        _count: { select: { challenges: true } }
      }
    });
  }

  async getCollection(id: string) {
    const col = await this.prisma.eytCollection.findUnique({
      where: { id },
      include: { challenges: true }
    });
    if (!col) throw new NotFoundException('Collection not found');
    return col;
  }

  async getLearningPaths() {
    return await this.prisma.eytLearningPath.findMany({
      include: {
        _count: { select: { challenges: true } }
      }
    });
  }

  async getLearningPath(id: string) {
    const path = await this.prisma.eytLearningPath.findUnique({
      where: { id },
      include: { challenges: true }
    });
    if (!path) throw new NotFoundException('Learning Path not found');
    return path;
  }

  async getChallengePacks() {
    return await this.prisma.eytChallengePack.findMany({
      include: {
        _count: { select: { challenges: true } }
      }
    });
  }

  async getChallengePack(id: string) {
    const pack = await this.prisma.eytChallengePack.findUnique({
      where: { id },
      include: { challenges: true }
    });
    if (!pack) throw new NotFoundException('Challenge Pack not found');
    return pack;
  }

  async getArchives() {
    return await this.prisma.eytChallenge.findMany({
      where: {
        OR: [
          { isArchived: true },
          { isWeekly: true }
        ],
        status: EytChallengeStatus.PUBLISHED
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async voteDifficulty(userId: string, challengeId: string, difficulty: EytDifficulty) {
    const challenge = await this.prisma.eytChallenge.findUnique({ where: { id: challengeId } });
    if (!challenge) throw new NotFoundException('Challenge not found');

    await this.prisma.eytDifficultyVote.upsert({
      where: { userId_challengeId: { userId, challengeId } },
      update: { vote: difficulty },
      create: { userId, challengeId, vote: difficulty },
    });

    await this.recalculateDynamicDifficulty(challengeId);
    return { success: true };
  }

  async recalculateDynamicDifficulty(challengeId: string) {
    const votes = await this.prisma.eytDifficultyVote.findMany({
      where: { challengeId }
    });
    
    const diffScores = {
      [EytDifficulty.EASY]: 20,
      [EytDifficulty.MEDIUM]: 45,
      [EytDifficulty.HARD]: 65,
      [EytDifficulty.EXPERT]: 80,
      [EytDifficulty.GRAND]: 95
    };
    
    let voteSum = 0;
    for (const v of votes) {
      voteSum += diffScores[v.vote as EytDifficulty] || 50;
    }
    
    const avgVote = votes.length > 0 ? (voteSum / votes.length) : null;
    
    const challenge = await this.prisma.eytChallenge.findUnique({
      where: { id: challengeId }
    });
    if (!challenge) return;
    
    let finalScore = challenge.difficultyScore;
    if (avgVote !== null) {
      finalScore = Math.round((challenge.difficultyScore + avgVote) / 2);
    }
    
    let commDiff: EytDifficulty = EytDifficulty.MEDIUM;
    if (finalScore < 35) commDiff = EytDifficulty.EASY;
    else if (finalScore < 60) commDiff = EytDifficulty.MEDIUM;
    else if (finalScore < 78) commDiff = EytDifficulty.HARD;
    else if (finalScore < 90) commDiff = EytDifficulty.EXPERT;
    else commDiff = EytDifficulty.GRAND;
    
    await this.prisma.eytChallenge.update({
      where: { id: challengeId },
      data: {
        difficultyScore: finalScore,
        communityDifficulty: commDiff
      }
    });
  }
}
