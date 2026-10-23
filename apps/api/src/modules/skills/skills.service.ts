import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SkillDto, UserSkillDto } from '@ple/types';
import { AddUserSkillDto } from './dto/add-user-skill.dto';
import { UpdateSubtopicProgressDto } from './dto/update-subtopic-progress.dto';

@Injectable()
export class SkillsService {
  constructor(private readonly prisma: PrismaService) {}

  async getCatalog(search?: string, category?: string): Promise<SkillDto[]> {
    const skills = await this.prisma.skill.findMany({
      where: {
        ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
        ...(category ? { category } : {}),
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
    return skills.map((s) => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
      category: s.category,
      description: s.description ?? undefined,
      iconUrl: s.iconUrl ?? undefined,
      subtopics: (s.subtopics as any) || undefined,
      createdAt: s.createdAt.toISOString(),
    }));
  }

  async getUserSkills(userId: string): Promise<UserSkillDto[]> {
    const userSkills = await this.prisma.userSkill.findMany({
      where: { userId },
      include: { skill: true },
      orderBy: { createdAt: 'desc' },
    });
    return userSkills.map((us) => ({
      id: us.id,
      skillId: us.skillId,
      skill: {
        id: us.skill.id,
        name: us.skill.name,
        slug: us.skill.slug,
        category: us.skill.category,
        description: us.skill.description ?? undefined,
        iconUrl: us.skill.iconUrl ?? undefined,
        subtopics: (us.skill.subtopics as any) || undefined,
        createdAt: us.skill.createdAt.toISOString(),
      },
      level: us.level,
      completedSubtopics: us.completedSubtopics,
      createdAt: us.createdAt.toISOString(),
    }));
  }

  async addUserSkill(userId: string, dto: AddUserSkillDto): Promise<UserSkillDto> {
    const skill = await this.prisma.skill.findUnique({ where: { id: dto.skillId } });
    if (!skill) throw new NotFoundException('Skill not found');

    const existing = await this.prisma.userSkill.findUnique({
      where: { userId_skillId: { userId, skillId: dto.skillId } },
    });

    if (existing) {
      // Update level if skill already owned
      const updated = await this.prisma.userSkill.update({
        where: { userId_skillId: { userId, skillId: dto.skillId } },
        data: { level: dto.level },
        include: { skill: true },
      });
      return {
        id: updated.id,
        skillId: updated.skillId,
        skill: {
          id: updated.skill.id,
          name: updated.skill.name,
          slug: updated.skill.slug,
          category: updated.skill.category,
          description: updated.skill.description ?? undefined,
          iconUrl: updated.skill.iconUrl ?? undefined,
          subtopics: (updated.skill.subtopics as any) || undefined,
          createdAt: updated.skill.createdAt.toISOString(),
        },
        level: updated.level,
        completedSubtopics: updated.completedSubtopics,
        createdAt: updated.createdAt.toISOString(),
      };
    }

    const created = await this.prisma.userSkill.create({
      data: { userId, skillId: dto.skillId, level: dto.level },
      include: { skill: true },
    });
    return {
      id: created.id,
      skillId: created.skillId,
      skill: {
        id: created.skill.id,
        name: created.skill.name,
        slug: created.skill.slug,
        category: created.skill.category,
        description: created.skill.description ?? undefined,
        iconUrl: created.skill.iconUrl ?? undefined,
        subtopics: (created.skill.subtopics as any) || undefined,
        createdAt: created.skill.createdAt.toISOString(),
      },
      level: created.level,
      completedSubtopics: created.completedSubtopics,
      createdAt: created.createdAt.toISOString(),
    };
  }

  async removeUserSkill(userId: string, skillId: string): Promise<void> {
    const existing = await this.prisma.userSkill.findUnique({
      where: { userId_skillId: { userId, skillId } },
    });
    if (!existing) throw new NotFoundException('Skill not in your profile');
    await this.prisma.userSkill.delete({ where: { userId_skillId: { userId, skillId } } });
  }

  async updateSubtopicProgress(
    userId: string,
    skillId: string,
    dto: UpdateSubtopicProgressDto,
  ): Promise<UserSkillDto> {
    const userSkill = await this.prisma.userSkill.findUnique({
      where: { userId_skillId: { userId, skillId } },
      include: { skill: true },
    });

    if (!userSkill) {
      throw new NotFoundException('Skill not found in user profile');
    }

    let completedSubtopics = userSkill.completedSubtopics || [];
    if (dto.isCompleted) {
      if (!completedSubtopics.includes(dto.subtopicName)) {
        completedSubtopics.push(dto.subtopicName);
      }
    } else {
      completedSubtopics = completedSubtopics.filter((name) => name !== dto.subtopicName);
    }

    const updated = await this.prisma.userSkill.update({
      where: { userId_skillId: { userId, skillId } },
      data: { completedSubtopics },
      include: { skill: true },
    });

    return {
      id: updated.id,
      skillId: updated.skillId,
      skill: {
        id: updated.skill.id,
        name: updated.skill.name,
        slug: updated.skill.slug,
        category: updated.skill.category,
        description: updated.skill.description ?? undefined,
        iconUrl: updated.skill.iconUrl ?? undefined,
        subtopics: (updated.skill.subtopics as any) || undefined,
        createdAt: updated.skill.createdAt.toISOString(),
      },
      level: updated.level,
      completedSubtopics: updated.completedSubtopics,
      createdAt: updated.createdAt.toISOString(),
    };
  }
}
