import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateInterestsDto } from './dto/update-interests.dto';
import { UserDto, SkillLevel } from '@ple/types';
import { AIGatewayService } from '../ai-gateway/ai-gateway.service';
import { AvatarStorageService } from './avatar-storage.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiGateway: AIGatewayService,
    private readonly avatarStorage: AvatarStorageService,
  ) {}

  async findById(userId: string): Promise<UserDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: { include: { interests: true } },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return this.toDto(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<UserDto> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const updatedProfile = await this.prisma.profile.upsert({
      where: { userId },
      update: {
        name: dto.name,
        branch: dto.branch,
        semester: dto.semester,
        careerGoal: dto.careerGoal,
        skillLevel: dto.skillLevel,
        bio: dto.bio,
        avatarUrl: dto.avatarUrl,
        knowledgeDomains: dto.knowledgeDomains,
        domainSkillLevels: dto.domainSkillLevels,
        learningStyle: dto.learningStyle,
        careerAwarenessAnswers: dto.careerAwarenessAnswers,
        projectExperience: dto.projectExperience,
        internshipExperience: dto.internshipExperience,
        interviewReadiness: dto.interviewReadiness,
      },
      create: {
        userId,
        name: dto.name ?? '',
        branch: dto.branch ?? '',
        semester: dto.semester ?? 1,
        careerGoal: dto.careerGoal ?? '',
        skillLevel: dto.skillLevel ?? 'BEGINNER',
        bio: dto.bio,
        avatarUrl: dto.avatarUrl,
        knowledgeDomains: dto.knowledgeDomains ?? [],
        domainSkillLevels: dto.domainSkillLevels ?? {},
        learningStyle: dto.learningStyle ?? 'VISUAL',
        careerAwarenessAnswers: dto.careerAwarenessAnswers ?? {},
        projectExperience: dto.projectExperience ?? 'NONE',
        internshipExperience: dto.internshipExperience ?? 'NONE',
        interviewReadiness: dto.interviewReadiness ?? 'LOW',
        careerReadinessScore: 0,
      },
    });

    // Calculate score
    const careerReadinessScore = await this.calculateCareerReadinessScore(userId, updatedProfile);

    // Save score
    await this.prisma.profile.update({
      where: { userId },
      data: { careerReadinessScore },
    });

    return this.findById(userId);
  }

  async updateInterests(userId: string, dto: UpdateInterestsDto): Promise<UserDto> {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Profile not found. Complete your profile first.');

    // Replace all interests atomically
    await this.prisma.$transaction([
      this.prisma.userInterest.deleteMany({ where: { profileId: profile.id } }),
      this.prisma.userInterest.createMany({
        data: dto.topics.map((topic) => ({ profileId: profile.id, topic })),
      }),
    ]);

    return this.findById(userId);
  }

  private async calculateCareerReadinessScore(userId: string, profile: any): Promise<number> {
    if (!profile) return 0;

    // 1. Profile Completion (Max 35 points)
    let profileScore = 0;
    if (profile.name) profileScore += 5;
    if (profile.bio) profileScore += 5;
    if (profile.branch) profileScore += 5;
    if (profile.semester) profileScore += 5;
    if (profile.careerGoal) profileScore += 5;
    if (profile.learningStyle) profileScore += 5;
    if (profile.projectExperience && profile.projectExperience !== 'NONE') profileScore += 2.5;
    if (profile.internshipExperience && profile.internshipExperience !== 'NONE') profileScore += 2.5;

    // 2. Knowledge Domains (Max 15 points)
    const domainsCount = profile.knowledgeDomains ? profile.knowledgeDomains.length : 0;
    const domainScore = Math.min(domainsCount * 5, 15);

    // 3. Domain Skill Levels (Max 15 points)
    let skillLevelScore = 0;
    if (profile.domainSkillLevels && typeof profile.domainSkillLevels === 'object') {
      const levels = Object.values(profile.domainSkillLevels);
      if (levels.length > 0) {
        let totalVal = 0;
        for (const lvl of levels) {
          if (lvl === 'INTERMEDIATE') totalVal += 10;
          else if (lvl === 'ADVANCED') totalVal += 15;
          else totalVal += 5; // BEGINNER
        }
        skillLevelScore = Math.min(Math.round(totalVal / levels.length), 15);
      }
    }

    // 4. Active Roadmap Progress (Max 15 points)
    let roadmapScore = 0;
    const activeRoadmap = await this.prisma.roadmap.findFirst({
      where: { userId, status: 'ACTIVE' },
      include: { steps: true },
    });
    if (activeRoadmap && activeRoadmap.steps.length > 0) {
      const completedSteps = activeRoadmap.steps.filter((s) => s.isCompleted).length;
      roadmapScore = Math.round((completedSteps / activeRoadmap.steps.length) * 15);
    }

    // 5. Skills Completion Progress (Max 10 points)
    let skillsScore = 0;
    const userSkills = await this.prisma.userSkill.findMany({ where: { userId } });
    if (userSkills.length > 0) {
      const completedSubtopicsCount = userSkills.reduce(
        (acc, us) => acc + (us.completedSubtopics ? us.completedSubtopics.length : 0),
        0,
      );
      skillsScore = Math.min(userSkills.length * 2 + completedSubtopicsCount * 1, 10);
    }

    // 6. Quiz Performance (Max 10 points)
    let quizScore = 0;
    const attempts = await this.prisma.quizAttempt.findMany({
      where: { userId },
      select: { score: true, totalQuestions: true },
    });
    if (attempts.length > 0) {
      const avgPercentage = attempts.reduce((acc, a) => acc + (a.score / (a.totalQuestions || 10)), 0) / attempts.length;
      quizScore = Math.round(avgPercentage * 10);
    }

    return Math.min(profileScore + domainScore + skillLevelScore + roadmapScore + skillsScore + quizScore, 100);
  }

  private toDto(user: any): UserDto {
    return {
      id: user.id,
      email: user.email,
      role: user.role as UserDto['role'],
      emailVerified: user.emailVerified,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      profile: user.profile
        ? {
            id: user.profile.id,
            userId: user.profile.userId,
            name: user.profile.name,
            branch: user.profile.branch,
            semester: user.profile.semester,
            skillLevel: user.profile.skillLevel as SkillLevel,
            careerGoal: user.profile.careerGoal,
            bio: user.profile.bio ?? undefined,
            avatarUrl: user.profile.avatarUrl ?? undefined,
            knowledgeDomains: user.profile.knowledgeDomains || [],
            domainSkillLevels: user.profile.domainSkillLevels || {},
            learningStyle: user.profile.learningStyle || 'VISUAL',
            careerAwarenessAnswers: user.profile.careerAwarenessAnswers || {},
            projectExperience: user.profile.projectExperience || 'NONE',
            internshipExperience: user.profile.internshipExperience || 'NONE',
            interviewReadiness: user.profile.interviewReadiness || 'LOW',
            careerReadinessScore: user.profile.careerReadinessScore || 0,
            resume: user.profile.resume ?? undefined,
            createdAt: user.profile.createdAt.toISOString(),
            updatedAt: user.profile.updatedAt.toISOString(),
            interests: user.profile.interests.map((i: any) => ({ id: i.id, topic: i.topic })),
          }
        : undefined,
    };
  }

  async generateResume(userId: string): Promise<UserDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        userSkills: {
          include: { skill: true }
        },
        roadmaps: {
          where: { status: 'ACTIVE' },
          include: { steps: true }
        },
        quizAttempts: true,
        learningGoals: true,
        eytBadges: true,
        eytAttempts: true
      }
    });

    if (!user || !user.profile) {
      throw new NotFoundException('User profile not found. Complete your onboarding first.');
    }

    const profile = user.profile;

    // Compile skills statistics
    const skillsList = user.userSkills.map(us => ({
      name: us.skill.name,
      category: us.skill.category,
      level: us.level,
      completedSubtopicsCount: us.completedSubtopics ? us.completedSubtopics.length : 0
    }));

    // Compile active roadmaps statistics
    const activeRoadmapsList = user.roadmaps.map(r => {
      const totalSteps = r.steps.length;
      const completedSteps = r.steps.filter(s => s.isCompleted).length;
      return {
        title: r.title,
        goal: r.goal,
        branch: r.branch,
        semester: r.semester,
        progress: totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0,
        completedSteps,
        totalSteps
      };
    });

    // Compile quiz statistics
    const totalQuizAttempts = user.quizAttempts.length;
    const avgQuizScore = totalQuizAttempts > 0
      ? Math.round(user.quizAttempts.reduce((acc, a) => acc + (a.score / (a.totalQuestions || 10)), 0) / totalQuizAttempts * 100)
      : 0;

    // Compile learning goals statistics
    const completedGoals = user.learningGoals.filter(g => g.status === 'COMPLETED').length;
    const totalGoals = user.learningGoals.length;

    // Compile EYT details
    const eytBadgesStr = user.eytBadges.map(b => b.badgeType).join(', ') || 'None yet';

    // Format prompt
    const prompt = `
Analyze the following student details, skills catalog progress, roadmap steps, quiz attempts, learning goals milestones, and cognitive thinking evaluation profiles to generate a polished, professional technical resume in JSON format.

STUDENT PROFILE:
- Name: ${profile.name}
- Branch: ${profile.branch}
- Current Semester: Semester ${profile.semester}
- Career Goal: ${profile.careerGoal}
- Bio/Self-description: ${profile.bio || 'Not provided'}
- Project Experience: ${profile.projectExperience}
- Internship Experience: ${profile.internshipExperience}
- Interview Readiness: ${profile.interviewReadiness}

EYT COGNITIVE PROFILE (Enhance Your Thinking):
- Thinking Level: ${profile.thinkingLevel}
- Total Solved Challenges: ${profile.challengesSolved}
- Overall Thinking Score: ${profile.thinkingScore}/100
- Average Logical Reasoning Score: ${profile.scoreLogicalReasoning}/100
- Average Originality Score: ${profile.scoreOriginality}/100
- Average Reflection Score: ${profile.scoreReflection}/100
- Earned Badges: ${eytBadgesStr}

ADDED SKILLS PROFILE:
${skillsList.length > 0 ? skillsList.map(s => `- ${s.name} (${s.category}): Level ${s.level}, Completed Subtopics: ${s.completedSubtopicsCount}`).join('\n') : 'No skills self-assessed yet.'}

ROADMAPS PROGRESS:
${activeRoadmapsList.length > 0 ? activeRoadmapsList.map(r => `- Active Roadmap "${r.title}" (Goal: ${r.goal}): ${r.progress}% complete (${r.completedSteps}/${r.totalSteps} steps completed)`).join('\n') : 'No active roadmaps generated yet.'}

PRACTICE QUIZZES PERFORMANCE:
- Total Quizzes Attempted: ${totalQuizAttempts}
- Average Verification Score: ${avgQuizScore}%

LEARNING GOALS MET:
- Goals Completed: ${completedGoals} out of ${totalGoals} total goals set.

INSTRUCTIONS:
You are MIKE, an expert technical recruiter and mentor. Write a resume tailored for their career goal of "${profile.careerGoal}". Translate their study milestones, quiz scores, and roadmap achievements into strong, professional resume descriptions. 

CRITICAL REQUIREMENT: Incorporate evidence of their cognitive thinking ability (e.g. Logical Reasoning, Originality, Critical Thinking, Systems Thinking) based on their EYT profile. Showcase these as key strengths or milestones to make the resume highly competitive and ATS-friendly.

Return ONLY a raw JSON object matching this TypeScript interface (no extra text, no markdown wrappers, just JSON):
{
  "summary": "Professional summary highlighting their branch, career goal, and technical focus (2-3 sentences).",
  "technicalSkills": {
    "languages": string[], // List of programming languages based on their skills
    "frameworksTools": string[], // List of frameworks and developer tools
    "concepts": string[] // Core CS/Engineering concepts (e.g. System Design, Database Systems)
  },
  "experience": [
    {
      "role": string,
      "organization": string,
      "period": string,
      "bullets": string[] // 3 high-impact professional bullets describing their learning, achievements, and roadmap completions
    }
  ],
  "projects": [
    {
      "title": string,
      "description": string // A professional project description reflecting their active roadmap or main completed goals
    }
  ],
  "milestones": string[] // 3-4 bullet points of actual platform statistics represented professionally (quizzes completed, active goals met, roadmaps advanced)
}
`;

    const systemPrompt = "You are MIKE, a career mentor and professional resume builder. Your output must be valid JSON only.";
    
    try {
      this.logger.log(`Generating AI resume for user ${userId} using Gemini...`);
      const generatedResume = await this.aiGateway.generateAndParseJSON<any>('tutor', prompt, systemPrompt);
      
      // Save the generated resume JSON back to database
      await this.prisma.profile.update({
        where: { userId },
        data: { resume: generatedResume }
      });
    } catch (err) {
      this.logger.error('Failed to generate resume via AI, creating fallback:', err);
      
      // Let's create a default resume object as fallback so the endpoint doesn't fail
      const fallbackResume = {
        summary: `Dedicated ${profile.branch} student focusing on becoming a ${profile.careerGoal || 'Software Engineer'}. Currently in Semester ${profile.semester} and pursuing advanced engineering competencies.`,
        technicalSkills: {
          languages: skillsList.filter(s => s.category.toLowerCase().includes('lang') || ['javascript', 'typescript', 'python', 'java', 'c++', 'go', 'rust'].includes(s.name.toLowerCase())).map(s => s.name),
          frameworksTools: skillsList.filter(s => !s.category.toLowerCase().includes('lang')).map(s => s.name),
          concepts: profile.knowledgeDomains || []
        },
        experience: [
          {
            role: "Software Engineering Student & Project Developer",
            organization: "Personalized Learning Empowerment (PLE)",
            period: "Present",
            bullets: [
              `Completed ${skillsList.length} core competencies with self-assessed skill levels up to ${profile.skillLevel}.`,
              `Engaged in active curriculum tracking across ${profile.branch} semester requirements.`,
              `Achieved verification across learning domains including: ${(profile.knowledgeDomains || []).join(', ')}.`
            ]
          }
        ],
        projects: [
          {
            title: `Technical Competence Roadmap: ${profile.careerGoal || 'Software Engineering'}`,
            description: `Designed and followed a personalized learning roadmap on the PLE platform, tracking milestones and verifying engineering topics.`
          }
        ],
        milestones: [
          `Self-assessed ${skillsList.length} skills in database`,
          `Maintained semester ${profile.semester} target path`,
          `Set up learning goals and curriculum alignment`
        ]
      };

      await this.prisma.profile.update({
        where: { userId },
        data: { resume: fallbackResume }
      });
    }

    return this.findById(userId);
  }

  async updateAvatar(userId: string, file: any): Promise<string> {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('User profile not found');

    if (profile.avatarUrl) {
      await this.avatarStorage.deleteAvatar(profile.avatarUrl);
    }

    const rawAvatarUrl = await this.avatarStorage.uploadAvatar(userId, file);
    const avatarUrl = `${rawAvatarUrl}?v=${Date.now()}`;

    await this.prisma.profile.update({
      where: { userId },
      data: { avatarUrl },
    });

    return avatarUrl;
  }

  async removeAvatar(userId: string): Promise<void> {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('User profile not found');

    if (profile.avatarUrl) {
      await this.avatarStorage.deleteAvatar(profile.avatarUrl);
    }

    await this.prisma.profile.update({
      where: { userId },
      data: { avatarUrl: null },
    });
  }
}
