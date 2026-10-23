import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

export interface StudentContextPayload {
  userId: string;
  careerGoal: string;
  branch: string;
  semester: number;
  thinkingScore: number;
  thinkingLevel: string;
  masteredSkills: string[];
  learningSkills: string[];
  weakConcepts: string[];
  struggledQuestions: string[];
  recentQuizScores: number[];
  activeRoadmapTitle: string | null;
}

@Injectable()
export class StudentContextService {
  private readonly logger = new Logger(StudentContextService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Aggregates explicit student profile, mastery, quiz attempt history, and weak concepts.
   */
  async buildStudentContext(userId: string): Promise<StudentContextPayload> {
    try {
      const profile = await this.prisma.profile.findUnique({ where: { userId } });
      const userSkills = await this.prisma.userSkill.findMany({
        where: { userId },
        include: { skill: true },
      });

      const masteredSkills: string[] = [];
      const learningSkills: string[] = [];

      userSkills.forEach((us) => {
        const skillName = us.skill?.name ?? us.skillId;
        if (us.level === 'ADVANCED') {
          masteredSkills.push(skillName);
        } else {
          learningSkills.push(skillName);
        }
      });

      const recentAttempts = await this.prisma.quizAttempt.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { score: true, id: true },
      });

      const recentQuizScores = recentAttempts.map((a) => a.score);

      const weakAnswers = await this.prisma.attemptAnswer.findMany({
        where: {
          attempt: { userId },
          isCorrect: false,
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { question: { select: { questionText: true } } },
      });

      const struggledQuestions = Array.from(
        new Set(weakAnswers.map((w) => w.question?.questionText ?? '').filter(Boolean)),
      ).slice(0, 5);

      const conceptMasteries = await this.prisma.studentConceptMastery.findMany({
        where: { userId, status: 'WEAK_IN' },
        include: { node: { select: { name: true } } },
      });

      const weakConcepts = conceptMasteries.map((cm) => cm.node?.name).filter(Boolean);

      const activeRoadmap = await this.prisma.roadmap.findFirst({
        where: { userId, status: 'ACTIVE' },
        select: { title: true },
      });

      return {
        userId,
        careerGoal: profile?.careerGoal ?? 'Software Engineer',
        branch: profile?.branch ?? 'Computer Science',
        semester: profile?.semester ?? 6,
        thinkingScore: profile?.thinkingScore ?? 50,
        thinkingLevel: profile?.thinkingLevel ?? 'BEGINNER',
        masteredSkills,
        learningSkills,
        weakConcepts,
        struggledQuestions,
        recentQuizScores,
        activeRoadmapTitle: activeRoadmap?.title ?? null,
      };
    } catch (err: any) {
      this.logger.error(`Error building student context: ${err.message}`);
      return {
        userId,
        careerGoal: 'Software Engineer',
        branch: 'Computer Science',
        semester: 6,
        thinkingScore: 50,
        thinkingLevel: 'BEGINNER',
        masteredSkills: [],
        learningSkills: [],
        weakConcepts: [],
        struggledQuestions: [],
        recentQuizScores: [],
        activeRoadmapTitle: null,
      };
    }
  }
}
