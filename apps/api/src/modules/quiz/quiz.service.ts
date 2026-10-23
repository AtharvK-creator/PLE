import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AIGatewayService } from '../ai-gateway/ai-gateway.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { GenerateQuizDto } from './dto/generate-quiz.dto';
import { SubmitAttemptDto } from './dto/submit-attempt.dto';
import { buildQuizPrompt, buildQuizSystemPrompt } from '../ai-gateway/prompts/quiz.prompt';
import { QuizDto, AttemptResultDto } from '@ple/types';

interface QuizAIQuestion {
  questionText: string;
  orderIndex: number;
  explanation?: string;
  options: Array<{
    optionLabel: string;
    optionText: string;
    isCorrect: boolean;
  }>;
}

@Injectable()
export class QuizService {
  private readonly logger = new Logger(QuizService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiGateway: AIGatewayService,
    private readonly analytics: AnalyticsService,
  ) {}

  async generate(userId: string, dto: GenerateQuizDto): Promise<QuizDto> {
    const totalQuestions = dto.totalQuestions ?? 10;
    this.logger.log(
      `Generating quiz for user ${userId}: topic=${dto.topic}, difficulty=${dto.difficulty}`,
    );

    const prompt = buildQuizPrompt({ ...dto, totalQuestions });
    const systemPrompt = buildQuizSystemPrompt();

    const aiQuestions = await this.aiGateway.generateAndParseJSON<QuizAIQuestion[]>(
      'quiz',
      prompt,
      systemPrompt,
    );

    if (!Array.isArray(aiQuestions) || aiQuestions.length === 0) {
      throw new BadRequestException('AI returned invalid quiz format. Please try again.');
    }

    const quiz = await this.prisma.$transaction(async (tx) => {
      const created = await tx.quiz.create({
        data: {
          userId,
          topic: dto.topic,
          subject: dto.subject,
          difficulty: dto.difficulty,
          totalQuestions: aiQuestions.length,
        },
      });

      for (const q of aiQuestions) {
        const question = await tx.question.create({
          data: {
            quizId: created.id,
            questionText: q.questionText,
            orderIndex: q.orderIndex,
            explanation: q.explanation ?? null,
          },
        });

        await tx.questionOption.createMany({
          data: q.options.map((opt) => ({
            questionId: question.id,
            optionText: opt.optionText,
            optionLabel: opt.optionLabel,
            isCorrect: opt.isCorrect,
          })),
        });
      }

      return created;
    });

    this.analytics.capture(userId, 'quiz_generated', {
      topic: dto.topic,
      difficulty: dto.difficulty,
      totalQuestions: aiQuestions.length,
    });

    return this.findById(userId, quiz.id);
  }

  async findAll(userId: string): Promise<Omit<QuizDto, 'questions'>[]> {
    const quizzes = await this.prisma.quiz.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return quizzes.map((q) => ({
      id: q.id,
      userId: q.userId,
      topic: q.topic,
      subject: q.subject,
      difficulty: q.difficulty,
      totalQuestions: q.totalQuestions,
      questions: [],
      createdAt: q.createdAt.toISOString(),
    }));
  }

  async findById(userId: string, quizId: string): Promise<QuizDto> {
    const quiz = await this.prisma.quiz.findFirst({
      where: { id: quizId, userId },
      include: {
        questions: {
          include: { options: true },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });
    if (!quiz) throw new NotFoundException('Quiz not found');
    return this.toQuizDto(quiz);
  }

  async submitAttempt(
    userId: string,
    quizId: string,
    dto: SubmitAttemptDto,
  ): Promise<AttemptResultDto> {
    const quiz = await this.prisma.quiz.findFirst({
      where: { id: quizId, userId },
      include: {
        questions: {
          include: { options: true },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });
    if (!quiz) throw new NotFoundException('Quiz not found');

    const answerMap = new Map(dto.answers.map((a) => [a.questionId, a.selectedOptionId]));

    let score = 0;
    const attemptAnswers: Array<{
      questionId: string;
      selectedOptionId: string | null;
      isCorrect: boolean;
    }> = [];

    for (const question of quiz.questions) {
      const rawSelectedId = answerMap.get(question.id) ?? null;
      const selectedOptionId = rawSelectedId === '' ? null : rawSelectedId;
      const correctOption = question.options.find((o) => o.isCorrect);
      const isCorrect =
        selectedOptionId !== null && selectedOptionId === correctOption?.id;
      if (isCorrect) score++;
      attemptAnswers.push({ questionId: question.id, selectedOptionId, isCorrect });
    }

    const attempt = await this.prisma.$transaction(async (tx) => {
      const created = await tx.quizAttempt.create({
        data: {
          quizId,
          userId,
          score,
          totalQuestions: quiz.questions.length,
          timeTakenSeconds: dto.timeTakenSeconds,
        },
      });

      await tx.attemptAnswer.createMany({
        data: attemptAnswers.map((a) => ({
          attemptId: created.id,
          questionId: a.questionId,
          selectedOptionId: a.selectedOptionId,
          isCorrect: a.isCorrect,
        })),
      });

      return created;
    });

    this.analytics.capture(userId, 'quiz_completed', {
      score,
      totalQuestions: quiz.questions.length,
      timeTaken: dto.timeTakenSeconds,
    });

    return {
      id: attempt.id,
      quizId,
      score,
      totalQuestions: quiz.questions.length,
      timeTakenSeconds: dto.timeTakenSeconds,
      percentage: Math.round((score / quiz.questions.length) * 100),
      answers: quiz.questions.map((q) => {
        const correctOpt = q.options.find((o) => o.isCorrect);
        const selectedId = answerMap.get(q.id) ?? null;
        const isCorrect = selectedId !== null && selectedId === correctOpt?.id;
        return {
          questionId: q.id,
          questionText: q.questionText,
          selectedOptionId: selectedId,
          isCorrect,
          explanation: q.explanation ?? undefined,
          correctOptionId: correctOpt?.id ?? '',
        };
      }),
      completedAt: attempt.completedAt.toISOString(),
    };
  }

  async getAttemptHistory(userId: string) {
    const attempts = await this.prisma.quizAttempt.findMany({
      where: { userId },
      include: { quiz: { select: { topic: true, subject: true } } },
      orderBy: { completedAt: 'desc' },
      take: 50,
    });
    return attempts.map((a) => ({
      id: a.id,
      quizId: a.quizId,
      topic: a.quiz.topic,
      subject: a.quiz.subject,
      score: a.score,
      totalQuestions: a.totalQuestions,
      percentage: Math.round((a.score / a.totalQuestions) * 100),
      timeTakenSeconds: a.timeTakenSeconds,
      completedAt: a.completedAt.toISOString(),
    }));
  }

  private toQuizDto(quiz: {
    id: string;
    userId: string;
    topic: string;
    subject: string;
    difficulty: string;
    totalQuestions: number;
    createdAt: Date;
    questions: Array<{
      id: string;
      questionText: string;
      orderIndex: number;
      explanation: string | null;
      options: Array<{
        id: string;
        optionText: string;
        optionLabel: string;
        isCorrect: boolean;
      }>;
    }>;
  }): QuizDto {
    return {
      id: quiz.id,
      userId: quiz.userId,
      topic: quiz.topic,
      subject: quiz.subject,
      difficulty: quiz.difficulty as QuizDto['difficulty'],
      totalQuestions: quiz.totalQuestions,
      questions: quiz.questions.map((q) => ({
        id: q.id,
        questionText: q.questionText,
        orderIndex: q.orderIndex,
        explanation: q.explanation ?? undefined,
        // isCorrect intentionally excluded — only revealed in AttemptResult
        options: q.options.map((o) => ({
          id: o.id,
          optionText: o.optionText,
          optionLabel: o.optionLabel,
        })),
      })),
      createdAt: quiz.createdAt.toISOString(),
    };
  }
}
