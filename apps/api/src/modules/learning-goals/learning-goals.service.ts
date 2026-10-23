import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LearningGoalDto } from '@ple/types';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';

@Injectable()
export class LearningGoalsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll(userId: string): Promise<LearningGoalDto[]> {
    const goals = await this.prisma.learningGoal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return goals.map((g) => this.toDto(g));
  }

  async create(userId: string, dto: CreateGoalDto): Promise<LearningGoalDto> {
    const goal = await this.prisma.learningGoal.create({
      data: {
        userId,
        title: dto.title,
        description: dto.description,
        targetDate: dto.targetDate ? new Date(dto.targetDate) : undefined,
      },
    });
    return this.toDto(goal);
  }

  async update(userId: string, goalId: string, dto: UpdateGoalDto): Promise<LearningGoalDto> {
    const goal = await this.prisma.learningGoal.findFirst({ where: { id: goalId, userId } });
    if (!goal) throw new NotFoundException('Learning goal not found');

    const updated = await this.prisma.learningGoal.update({
      where: { id: goalId },
      data: {
        title: dto.title,
        description: dto.description,
        status: dto.status,
        roadmapId: dto.roadmapId,
        targetDate: dto.targetDate ? new Date(dto.targetDate) : undefined,
      },
    });
    return this.toDto(updated);
  }

  async delete(userId: string, goalId: string): Promise<void> {
    const goal = await this.prisma.learningGoal.findFirst({ where: { id: goalId, userId } });
    if (!goal) throw new NotFoundException('Learning goal not found');
    await this.prisma.learningGoal.delete({ where: { id: goalId } });
  }

  private toDto(goal: {
    id: string;
    userId: string;
    title: string;
    description: string | null;
    targetDate: Date | null;
    status: string;
    roadmapId: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): LearningGoalDto {
    return {
      id: goal.id,
      userId: goal.userId,
      title: goal.title,
      description: goal.description ?? undefined,
      targetDate: goal.targetDate?.toISOString(),
      status: goal.status as LearningGoalDto['status'],
      roadmapId: goal.roadmapId ?? undefined,
      createdAt: goal.createdAt.toISOString(),
      updatedAt: goal.updatedAt.toISOString(),
    };
  }
}
