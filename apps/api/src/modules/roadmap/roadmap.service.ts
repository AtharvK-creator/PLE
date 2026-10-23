import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AIGatewayService } from '../ai-gateway/ai-gateway.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { GenerateRoadmapDto } from './dto/generate-roadmap.dto';
import { UpdateStepDto } from './dto/update-step.dto';
import {
  buildRoadmapPrompt,
  buildRoadmapSystemPrompt,
} from '../ai-gateway/prompts/roadmap.prompt';
import { RoadmapDto } from '@ple/types';

interface RoadmapAIResponse {
  title: string;
  overview: string;
  steps: Array<{
    title: string;
    description: string;
    weekNumber: number;
    monthNumber: number;
    orderIndex: number;
    skills: string[];
  }>;
}

@Injectable()
export class RoadmapService {
  private readonly logger = new Logger(RoadmapService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiGateway: AIGatewayService,
    private readonly analytics: AnalyticsService,
  ) {}

  async generate(userId: string, dto: GenerateRoadmapDto): Promise<RoadmapDto> {
    this.logger.log(`Generating roadmap for user ${userId}: goal=${dto.goal}`);

    const prompt = buildRoadmapPrompt(dto);
    const systemPrompt = buildRoadmapSystemPrompt();

    const aiResponse = await this.aiGateway.generateAndParseJSON<RoadmapAIResponse>(
      'roadmap',
      prompt,
      systemPrompt,
    );

    // Build skill name → id map from catalog
    const catalogSkills = await this.prisma.skill.findMany({
      select: { id: true, name: true },
    });
    const skillMap = new Map(catalogSkills.map((s) => [s.name.toLowerCase(), s.id]));

    const roadmap = await this.prisma.$transaction(async (tx) => {
      const created = await tx.roadmap.create({
        data: {
          userId,
          title: aiResponse.title,
          goal: dto.goal,
          branch: dto.branch,
          semester: dto.semester,
          status: 'ACTIVE',
        },
      });

      for (const step of aiResponse.steps) {
        const createdStep = await tx.roadmapStep.create({
          data: {
            roadmapId: created.id,
            title: step.title,
            description: step.description,
            weekNumber: step.weekNumber,
            monthNumber: step.monthNumber,
            orderIndex: step.orderIndex,
            isCompleted: false,
          },
        });

        if (step.skills.length > 0) {
          await tx.roadmapSkill.createMany({
            data: step.skills.map((skillName) => ({
              stepId: createdStep.id,
              skillId: skillMap.get(skillName.toLowerCase()) ?? null,
              skillName,
            })),
          });
        }
      }

      return created;
    });

    this.analytics.capture(userId, 'roadmap_generated', {
      goal: dto.goal,
      branch: dto.branch,
      semester: dto.semester,
    });

    return this.findById(userId, roadmap.id);
  }

  async findAll(userId: string): Promise<RoadmapDto[]> {
    const roadmaps = await this.prisma.roadmap.findMany({
      where: { userId },
      include: {
        steps: {
          include: { skills: true },
          orderBy: { orderIndex: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return roadmaps.map((r) => this.toDto(r));
  }

  async findById(userId: string, roadmapId: string): Promise<RoadmapDto> {
    const roadmap = await this.prisma.roadmap.findFirst({
      where: { id: roadmapId, userId },
      include: {
        steps: {
          include: { skills: true },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });
    if (!roadmap) throw new NotFoundException('Roadmap not found');
    return this.toDto(roadmap);
  }

  async updateStep(
    userId: string,
    roadmapId: string,
    stepId: string,
    dto: UpdateStepDto,
  ): Promise<RoadmapDto> {
    const roadmap = await this.prisma.roadmap.findFirst({ where: { id: roadmapId, userId } });
    if (!roadmap) throw new NotFoundException('Roadmap not found');

    const step = await this.prisma.roadmapStep.findFirst({ where: { id: stepId, roadmapId } });
    if (!step) throw new NotFoundException('Step not found');

    await this.prisma.roadmapStep.update({
      where: { id: stepId },
      data: {
        isCompleted: dto.isCompleted,
        completedAt: dto.isCompleted ? new Date() : null,
      },
    });

    return this.findById(userId, roadmapId);
  }

  async archive(userId: string, roadmapId: string): Promise<RoadmapDto> {
    const roadmap = await this.prisma.roadmap.findFirst({ where: { id: roadmapId, userId } });
    if (!roadmap) throw new NotFoundException('Roadmap not found');

    await this.prisma.roadmap.update({
      where: { id: roadmapId },
      data: { status: 'ARCHIVED' },
    });

    return this.findById(userId, roadmapId);
  }

  private toDto(roadmap: {
    id: string;
    userId: string;
    title: string;
    goal: string;
    branch: string;
    semester: number;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    steps: Array<{
      id: string;
      title: string;
      description: string;
      weekNumber: number;
      monthNumber: number;
      orderIndex: number;
      isCompleted: boolean;
      completedAt: Date | null;
      skills: Array<{ skillName: string }>;
    }>;
  }): RoadmapDto {
    return {
      id: roadmap.id,
      userId: roadmap.userId,
      title: roadmap.title,
      goal: roadmap.goal,
      branch: roadmap.branch,
      semester: roadmap.semester,
      status: roadmap.status as RoadmapDto['status'],
      steps: roadmap.steps.map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        weekNumber: s.weekNumber,
        monthNumber: s.monthNumber,
        orderIndex: s.orderIndex,
        isCompleted: s.isCompleted,
        completedAt: s.completedAt?.toISOString(),
        skills: s.skills.map((sk) => sk.skillName),
      })),
      createdAt: roadmap.createdAt.toISOString(),
      updatedAt: roadmap.updatedAt.toISOString(),
    };
  }
}
