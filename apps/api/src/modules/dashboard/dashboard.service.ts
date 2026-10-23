import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface DashboardStats {
  roadmaps: {
    total: number;
    active: number;
    latestRoadmap: {
      id: string;
      title: string;
      goal: string;
      completedSteps: number;
      totalSteps: number;
    } | null;
  };
  quizzes: {
    totalAttempts: number;
    averageScore: number;
    recentAttempts: Array<{
      id: string;
      quizTopic: string;
      score: number;
      totalQuestions: number;
      completedAt: string;
    }>;
  };
  tutor: {
    totalSessions: number;
    totalMessages: number;
    recentSessions: Array<{
      id: string;
      title: string;
      messageCount: number;
      updatedAt: string;
    }>;
  };
  learningGoals: {
    total: number;
    active: number;
    completed: number;
  };
  skills: {
    total: number;
  };
  recentActivity: Array<{
    type: string;
    description: string;
    timestamp: string;
  }>;
  careerReadinessScore: number;
  skillsProgress: number;
  mikeRecommendations: string[];
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(userId: string): Promise<DashboardStats> {
    const [
      recentRoadmaps,
      recentQuizAttempts,
      recentSessions,
      goalGroups,
      userSkills,
      totalRoadmaps,
      activeRoadmaps,
      totalAttempts,
      avgScoreResult,
      totalSessions,
      totalMessages,
      profile,
    ] = await Promise.all([
      this.prisma.roadmap.findMany({
        where: { userId },
        include: { steps: { select: { isCompleted: true } } },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      this.prisma.quizAttempt.findMany({
        where: { userId },
        include: { quiz: { select: { topic: true } } },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      this.prisma.learningSession.findMany({
        where: { userId },
        include: { _count: { select: { messages: true } } },
        orderBy: { updatedAt: 'desc' },
        take: 5,
      }),
      this.prisma.learningGoal.groupBy({
        by: ['status'],
        where: { userId },
        _count: true,
      }),
      this.prisma.userSkill.findMany({
        where: { userId },
        include: { skill: true },
      }),
      this.prisma.roadmap.count({ where: { userId } }),
      this.prisma.roadmap.count({ where: { userId, status: 'ACTIVE' } }),
      this.prisma.quizAttempt.count({ where: { userId } }),
      this.prisma.quizAttempt.aggregate({
        where: { userId },
        _avg: { score: true },
      }),
      this.prisma.learningSession.count({ where: { userId } }),
      this.prisma.message.count({ where: { session: { userId } } }),
      this.prisma.profile.findUnique({ where: { userId } }),
    ]);

    const latestRoadmap = recentRoadmaps[0] ?? null;

    // Build goal counts from groupBy result
    const goalCounts = { total: 0, active: 0, completed: 0 };
    for (const g of goalGroups) {
      goalCounts.total += g._count;
      if (g.status === 'ACTIVE') goalCounts.active = g._count;
      if (g.status === 'COMPLETED') goalCounts.completed = g._count;
    }

    // Build recent activity feed, sorted by recency
    const recentActivity: DashboardStats['recentActivity'] = [
      ...recentQuizAttempts.slice(0, 2).map((a) => ({
        type: 'quiz',
        description: `Completed quiz on "${a.quiz.topic}" — score ${a.score}/${a.totalQuestions}`,
        timestamp: a.completedAt.toISOString(),
      })),
      ...recentSessions.slice(0, 2).map((s) => ({
        type: 'tutor',
        description: `AI Tutor session: ${s.title}`,
        timestamp: s.updatedAt.toISOString(),
      })),
      ...recentRoadmaps.slice(0, 1).map((r) => ({
        type: 'roadmap',
        description: `Roadmap created: ${r.title}`,
        timestamp: r.createdAt.toISOString(),
      })),
    ]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);

    // Calculate skills progress
    let totalSubtopicsCount = 0;
    let completedSubtopicsCount = 0;

    for (const us of userSkills) {
      const subtopics = Array.isArray(us.skill.subtopics) ? us.skill.subtopics : [];
      totalSubtopicsCount += subtopics.length;
      completedSubtopicsCount += us.completedSubtopics ? us.completedSubtopics.length : 0;
    }

    const skillsProgress = totalSubtopicsCount > 0
      ? Math.round((completedSubtopicsCount / totalSubtopicsCount) * 100)
      : 0;

    // Career Readiness Score
    const careerReadinessScore = profile?.careerReadinessScore ?? 0;

    // Build MIKE recommendations
    const recommendations: string[] = [];
    if (!profile || !profile.name || !profile.careerGoal) {
      recommendations.push("Onboarding incomplete. Fill out your student profile to help MIKE customize your mentoring.");
    } else if (careerReadinessScore < 50) {
      recommendations.push("Boost your Career Readiness Score by completing quizzes and marking roadmap steps as done.");
    }

    const activeRoadmap = recentRoadmaps.find((r) => r.status === 'ACTIVE');
    if (!activeRoadmap) {
      recommendations.push("No active roadmap found. Generate a customized roadmap with MIKE for structured career success.");
    } else {
      const completedStepsCount = activeRoadmap.steps.filter((s) => s.isCompleted).length;
      const totalStepsCount = activeRoadmap.steps.length;
      if (totalStepsCount > 0) {
        const pct = Math.round((completedStepsCount / totalStepsCount) * 100);
        if (pct < 100) {
          recommendations.push(`Keep going! Work on your active roadmap: "${activeRoadmap.title}" (${pct}% completed).`);
        }
      }
    }

    if (totalAttempts === 0) {
      recommendations.push("Benchmark your current knowledge domains by attempting a quick topic quiz.");
    } else {
      const avgScore = avgScoreResult._avg.score ?? 0;
      if (avgScore < 70) {
        recommendations.push("Ask MIKE AI Tutor to explain complex topics where you scored lower in recent quizzes.");
      }
    }

    if (userSkills.length === 0) {
      recommendations.push("Explore the skill catalog and add key programming or engineering skills to your profile.");
    } else {
      let foundUncompleted = false;
      for (const us of userSkills) {
        const subtopics = (Array.isArray(us.skill.subtopics) ? us.skill.subtopics : []) as any[];
        const completed = us.completedSubtopics || [];
        const uncompleted = subtopics.filter((sub: any) => !completed.includes(sub.name));
        if (uncompleted.length > 0) {
          recommendations.push(`Deepen your mastery: Complete the subtopic "${uncompleted[0].name}" under "${us.skill.name}".`);
          foundUncompleted = true;
          break;
        }
      }
      if (!foundUncompleted) {
        recommendations.push("Amazing job! You have completed all added skills. Add more skills from the catalog to expand your knowledge.");
      }
    }

    if (recommendations.length < 3) {
      recommendations.push("Ask MIKE AI Tutor: 'What should I study next to become an industry-ready developer?'");
      recommendations.push("Browse the news feed in the Informative Hub to keep up with industry trends.");
    }

    return {
      roadmaps: {
        total: totalRoadmaps,
        active: activeRoadmaps,
        latestRoadmap: latestRoadmap
          ? {
              id: latestRoadmap.id,
              title: latestRoadmap.title,
              goal: latestRoadmap.goal,
              completedSteps: latestRoadmap.steps.filter((s) => s.isCompleted).length,
              totalSteps: latestRoadmap.steps.length,
            }
          : null,
      },
      quizzes: {
        totalAttempts,
        averageScore: Math.round((avgScoreResult._avg.score ?? 0) * 10) / 10,
        recentAttempts: recentQuizAttempts.map((a) => ({
          id: a.id,
          quizTopic: a.quiz.topic,
          score: a.score,
          totalQuestions: a.totalQuestions,
          completedAt: a.completedAt.toISOString(),
        })),
      },
      tutor: {
        totalSessions,
        totalMessages,
        recentSessions: recentSessions.map((s) => ({
          id: s.id,
          title: s.title,
          messageCount: s._count.messages,
          updatedAt: s.updatedAt.toISOString(),
        })),
      },
      learningGoals: goalCounts,
      skills: { total: userSkills.length },
      recentActivity,
      careerReadinessScore,
      skillsProgress,
      mikeRecommendations: recommendations.slice(0, 3),
    };
  }
}
