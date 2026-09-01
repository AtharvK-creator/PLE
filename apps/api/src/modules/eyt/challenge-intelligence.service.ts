import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AIGatewayService } from '../ai-gateway/ai-gateway.service';
import { EytDifficulty, EytSourceType, EytChallengeStatus } from '@prisma/client';

// Curated concepts from public educational and engineering resources
export const CURATED_CONCEPTS = [
  {
    topic: 'Supersonic retropropulsion on landing trajectory optimization',
    category: 'Space Engineering',
    sourceType: EytSourceType.CASE_STUDY,
    sourceName: 'NASA Space Systems',
  },
  {
    topic: 'Thundering Herd Cache stampede under 100k QPS',
    category: 'System Design',
    sourceType: EytSourceType.SYSTEM_DESIGN,
    sourceName: 'Netflix Gateway Architecture',
  },
  {
    topic: 'Double spend mitigation in decentralized ledger transactions without global lock',
    category: 'Databases',
    sourceType: EytSourceType.ARCHITECTURE,
    sourceName: 'Distributed Consensus Mechanics',
  },
  {
    topic: 'Floating point rounding discrepancies in multi-currency ledgers',
    category: 'Programming Logic',
    sourceType: EytSourceType.INTERVIEW,
    sourceName: 'Stripe Core Ledger Team',
  },
  {
    topic: 'Logical resolution of paradoxes in game-theoretic auction bounds',
    category: 'Logical Thinking',
    sourceType: EytSourceType.PUZZLE,
    sourceName: 'Google Adwords Auction Engine',
  },
  {
    topic: 'Race condition on write-ahead log under extreme write contention',
    category: 'Databases',
    sourceType: EytSourceType.ARCHITECTURE,
    sourceName: 'PostgreSQL WAL contention',
  },
  {
    topic: 'Serverless cold start latency mitigation using JVM class-sharing',
    category: 'Cloud Engineering',
    sourceType: EytSourceType.CASE_STUDY,
    sourceName: 'AWS Lambda Platform Team',
  },
  {
    topic: 'Mitigating buffer overflow in safety-critical C codebases',
    category: 'Cyber Security',
    sourceType: EytSourceType.SECURITY,
    sourceName: 'NASA flight software controls',
  },
  {
    topic: 'Debugging memory leaks in long-running Node.js garbage collection loops',
    category: 'Programming Logic',
    sourceType: EytSourceType.INTERVIEW,
    sourceName: 'Microsoft Azure Teams',
  },
  {
    topic: 'System design for multi-region active-active database replication conflict resolution',
    category: 'System Design',
    sourceType: EytSourceType.SYSTEM_DESIGN,
    sourceName: 'Meta Distributed Storage',
  },
  {
    topic: 'Bitwise manipulation algorithms for high-speed packet header filtering in network switches',
    category: 'Programming Logic',
    sourceType: EytSourceType.INTERVIEW,
    sourceName: 'NVIDIA Networking Division',
  },
  {
    topic: 'Autopilot failure recovery and state estimation using Kalman filters',
    category: 'Space Engineering',
    sourceType: EytSourceType.CASE_STUDY,
    sourceName: 'ISRO Chandrayaan Autopilot',
  },
  {
    topic: 'Mitigating adversarial prompt injection attacks in enterprise LLM agents',
    category: 'AI Engineering',
    sourceType: EytSourceType.SECURITY,
    sourceName: 'OpenAI Safety Red-Team',
  },
  {
    topic: 'Designing highly consistent distributed locks using Redis/Raft',
    category: 'System Design',
    sourceType: EytSourceType.ARCHITECTURE,
    sourceName: 'General Engineering Standard Systems',
  },
  {
    topic: 'Product design decision trade-offs between infinite scroll and pagination',
    category: 'Product Thinking',
    sourceType: EytSourceType.PRODUCT,
    sourceName: 'Apple App Store Layout',
  },
];

@Injectable()
export class EytCollectionService {
  private readonly logger = new Logger(EytCollectionService.name);

  constructor(private readonly prisma: PrismaService) {}

  async collectUnusedTemplates(count = 5): Promise<any[]> {
    const existingTitles = await this.prisma.eytChallenge.findMany({
      select: { title: true },
    });
    const titleSet = new Set(existingTitles.map((c) => c.title.toLowerCase()));

    const filtered = CURATED_CONCEPTS.filter(
      (c) => !titleSet.has(c.topic.toLowerCase())
    );

    const shuffled = [...filtered].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }
}

@Injectable()
export class EytEnhancementService {
  private readonly logger = new Logger(EytEnhancementService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiGateway: AIGatewayService
  ) {}

  async enhanceConcept(concept: any, difficulty: EytDifficulty): Promise<any> {
    const systemPrompt = `You are MIKE, the PLE Head Cognitive Instructor. Your task is to enhance a basic topic into a world-class, premium critical thinking challenge.
Return ONLY a valid JSON object matching the exact specification below. Do not wrap in markdown code blocks.`;

    const prompt = `
Generate a PLE-native engineering and reasoning challenge based on this concept:
Topic: "${concept.topic}"
Category: "${concept.category}"
Difficulty: "${difficulty}"

Your output JSON must contain these exact keys:
1. title: A professional, clear title (2-6 words).
2. description: A highly detailed, realistic engineering scenario outlining constraints, environment parameters, and core dilemma. Do not provide code blocks in description unless necessary for debugging. Make it original.
3. referenceSolution: An expert engineering design or solution response.
4. alternativeSolutions: Array of 2 alternative approaches or design trade-offs.
5. industrySolution: Real-world industry perspective or standard systems used.
6. hint1: A subtle progressive hint (e.g. structural suggestion).
7. hint2: A more direct hint pointing to the algorithm/concept.
8. hint3: A very specific hint that guides them close to the answer.
9. skillsTested: Array of 3-4 skills (e.g. Logical Reasoning, Decomposition, Accuracy).
10. industryTags: Array of 2-3 tags (e.g. Distributed Systems, Avionics, FinTech).
11. companyTags: Array of 1-2 inspired company tags (e.g. SpaceX, Google, AWS).
12. estimatedThinkingTime: Integer (minutes, e.g. 15).
13. thinkingDomains: Array of 2 domains (e.g. Cloud, Systems, Logic).
14. xpReward: Integer (e.g. 150).
15. reflectionQuestions: Array of 3 key reflection questions.
16. interviewPerspective: Key takeaways for interviews (e.g. what interviewers look for).
17. industryPerspective: Real-world application perspective.
18. prerequisites: Array of 1-2 prerequisite concepts.
19. learningResources: Array of resources (URLs or descriptions).
20. followUpChallenges: Array of 1-2 related challenge titles.
21. editorial: A structured JSON matching this shape:
    {
      "whyThisProblemExists": "...",
      "expectedThinkingProcess": "...",
      "commonMistakes": ["...", "..."],
      "engineeringTradeoffs": ["...", "..."],
      "interviewExpectation": "...",
      "industryPerspective": "...",
      "furtherReading": ["...", "..."]
    }

Output JSON Structure:
{
  "title": "",
  "description": "",
  "referenceSolution": "",
  "alternativeSolutions": [],
  "industrySolution": "",
  "hint1": "",
  "hint2": "",
  "hint3": "",
  "skillsTested": [],
  "industryTags": [],
  "companyTags": [],
  "estimatedThinkingTime": 15,
  "thinkingDomains": [],
  "xpReward": 150,
  "reflectionQuestions": [],
  "interviewPerspective": "",
  "industryPerspective": "",
  "prerequisites": [],
  "learningResources": [],
  "followUpChallenges": [],
  "editorial": {
    "whyThisProblemExists": "",
    "expectedThinkingProcess": "",
    "commonMistakes": [],
    "engineeringTradeoffs": [],
    "interviewExpectation": "",
    "industryPerspective": "",
    "furtherReading": []
  }
}
`;

    try {
      const response = await this.aiGateway.generateAndParseJSON<any>(
        'eyt',
        prompt,
        systemPrompt
      );
      return {
        ...response,
        sourceType: concept.sourceType,
        sourceName: concept.sourceName,
        status: EytChallengeStatus.AI_ENHANCED,
      };
    } catch (error) {
      this.logger.error(`Failed to enhance concept via Gemini: ${concept.topic}`, error);
      // Construct high-quality fallback details locally
      return this.buildLocalFallback(concept, difficulty);
    }
  }

  buildLocalFallback(concept: any, difficulty: EytDifficulty): any {
    const isGrand = difficulty === EytDifficulty.GRAND;
    const isExpert = difficulty === EytDifficulty.EXPERT;
    return {
      title: `Design for: ${concept.topic}`,
      description: `Consider the architectural constraints and operational guidelines for a highly robust implementation of ${concept.topic}. Analyze key bottlenecks, design trade-offs, and critical error-recovery vectors under severe scale or execution limits.`,
      referenceSolution: `Implement high-efficiency caching, clear state partitioning, distributed transaction locking models (e.g., two-phase commits or Raft consensus), and robust retry-with-jitter mechanisms.`,
      alternativeSolutions: [
        'Deploy synchronized blocking mutexes to protect internal shared states.',
        'Use write-ahead logging (WAL) combined with asynchronous event sourcing queues.',
      ],
      industrySolution: `Modern industry environments (such as Netflix, Stripe, or SpaceX) utilize horizontal partitioning and decentralized messaging architectures to manage high throughput safely.`,
      hint1: 'Begin by identifying the absolute single points of failure in the system design.',
      hint2: 'Consider the impact of the CAP theorem and the trade-off between consistency and latency.',
      hint3: 'Analyze how buffer overflows or lock-contentions can be mitigated using non-blocking primitives.',
      skillsTested: ['Logical Reasoning', 'Decomposition', 'Critical Thinking'],
      industryTags: ['Cloud Architecture', 'Distributed Systems'],
      companyTags: [concept.sourceName.split(' ')[0]],
      estimatedThinkingTime: isGrand ? 45 : isExpert ? 30 : 20,
      thinkingDomains: [concept.category],
      xpReward: isGrand ? 800 : isExpert ? 400 : 200,
      sourceType: concept.sourceType,
      sourceName: concept.sourceName,
      status: EytChallengeStatus.AI_ENHANCED,
      reflectionQuestions: [
        'How does this design change if we scale the traffic by 10x?',
        'What are the security implications of utilizing this cache-fallback mechanism?',
      ],
      interviewPerspective: 'Interviewers look for solid understanding of system design trade-offs, specifically database locks and network delays.',
      industryPerspective: 'In production systems, minimizing write locks prevents thread starvation and database CPU spike crashes.',
      prerequisites: ['Basic Distributed Systems', 'Database Transaction Isolation levels'],
      learningResources: ['Designing Data-Intensive Applications by Martin Kleppmann'],
      followUpChallenges: [],
      editorial: {
        whyThisProblemExists: `This problem exists because modern distributed systems face structural limits under concurrency and network failures.`,
        expectedThinkingProcess: `Analyze request patterns -> identify locking bottlenecks -> propose decoupled or asynchronous structures -> write down trade-offs.`,
        commonMistakes: [
          'Assuming global distributed locks are free of network delays.',
          'Failing to handle database reconnection edge cases during failovers.',
        ],
        engineeringTradeoffs: [
          'Consistency vs latency: served stale data is faster but lacks instant consistency.',
          'Complexity vs performance: adding distributed locking increases logic complexity.',
        ],
        interviewExpectation: `Candidates should explicitly name trade-offs rather than proposing a single "perfect" solution.`,
        industryPerspective: `Real-world systems prioritize availability over strict consistency for non-financial operations.`,
        furtherReading: [
          'AWS Architecture Well-Architected Framework',
          'Google Cloud Architecture Blueprint Guidelines',
        ],
      },
    };
  }
}

@Injectable()
export class ChallengeIntelligenceService {
  private readonly logger = new Logger(ChallengeIntelligenceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly collector: EytCollectionService,
    private readonly enhancer: EytEnhancementService
  ) {}

  // Duplicate Detection
  async isDuplicate(title: string): Promise<boolean> {
    const existing = await this.prisma.eytChallenge.findFirst({
      where: { title: { equals: title, mode: 'insensitive' } },
    });
    return !!existing;
  }

  // Quality Analyzer
  calculateQualityScore(challenge: any): number {
    let score = 100;
    
    // Check completeness
    if (!challenge.title) score -= 20;
    if (!challenge.description || challenge.description.length < 50) score -= 20;
    if (!challenge.referenceSolution) score -= 15;
    if (!challenge.hint1 || !challenge.hint2 || !challenge.hint3) score -= 15;
    
    // Check editorial completeness
    const ed = challenge.editorial;
    if (!ed) {
      score -= 30;
    } else {
      if (!ed.whyThisProblemExists) score -= 5;
      if (!ed.expectedThinkingProcess) score -= 5;
      if (!ed.commonMistakes || ed.commonMistakes.length === 0) score -= 5;
      if (!ed.engineeringTradeoffs || ed.engineeringTradeoffs.length === 0) score -= 5;
    }

    return Math.max(0, score);
  }

  // Difficulty Analyzer
  calculateDifficultyScore(difficulty: EytDifficulty, challenge: any): number {
    // Return base score for each difficulty tier
    const baseScores = {
      [EytDifficulty.EASY]: 25,
      [EytDifficulty.MEDIUM]: 50,
      [EytDifficulty.HARD]: 70,
      [EytDifficulty.EXPERT]: 85,
      [EytDifficulty.GRAND]: 95,
    };
    const base = baseScores[difficulty] || 50;

    // Adjust score slightly based on description size (longer descriptions = more complex)
    const lengthBonus = Math.min(5, Math.floor((challenge.description?.length || 0) / 150));
    return Math.min(100, base + lengthBonus);
  }

  // Pipeline Ingestion
  async ingestWeeklyPool(week: number, year: number): Promise<number> {
    this.logger.log(`Starting challenge ingestion pipeline for Year ${year} Week ${week}...`);

    const existingCount = await this.prisma.eytChallenge.count({
      where: { weekNumber: week, year },
    });
    if (existingCount >= 5) {
      this.logger.log(`Weekly pool already contains ${existingCount} challenges. Skipping Ingestion.`);
      return 0;
    }

    const templates = await this.collector.collectUnusedTemplates(6);
    if (templates.length === 0) {
      this.logger.warn('No unused templates found to ingest.');
      return 0;
    }

    let addedCount = 0;
    const difficulties = [
      EytDifficulty.EASY,
      EytDifficulty.MEDIUM,
      EytDifficulty.MEDIUM,
      EytDifficulty.HARD,
      EytDifficulty.EXPERT,
      EytDifficulty.GRAND,
    ];

    for (let i = 0; i < templates.length; i++) {
      const template = templates[i];
      const diff = difficulties[i % difficulties.length];

      // 1. Duplicate Detection
      if (await this.isDuplicate(template.topic)) {
        this.logger.warn(`Skipping duplicate challenge topic: ${template.topic}`);
        continue;
      }

      // 2. Normalization & Enhancement (AI/Fallback)
      const data = await this.enhancer.enhanceConcept(template, diff);

      // 3. Quality & Difficulty Analysis
      const qualityScore = this.calculateQualityScore(data);
      const difficultyScore = this.calculateDifficultyScore(diff, data);

      // 4. Save to Database
      await this.prisma.eytChallenge.create({
        data: {
          title: data.title,
          category: template.category,
          difficulty: diff,
          description: data.description,
          referenceSolution: data.referenceSolution,
          alternativeSolutions: data.alternativeSolutions,
          industrySolution: data.industrySolution,
          xpReward: diff === EytDifficulty.GRAND ? 800 : data.xpReward || 100,
          hint1: data.hint1,
          hint2: data.hint2,
          hint3: data.hint3,
          skillsTested: data.skillsTested,
          industryTags: data.industryTags,
          companyTags: data.companyTags,
          thinkingDomains: data.thinkingDomains,
          estimatedThinkingTime: data.estimatedThinkingTime,
          sourceType: template.sourceType,
          sourceName: template.sourceName,
          weekNumber: week,
          year: year,
          status: EytChallengeStatus.PUBLISHED,
          AIGenerated: true,
          createdBy: 'AI Ingestion Pipeline',
          qualityScore,
          difficultyScore,
          reflectionQuestions: data.reflectionQuestions || [],
          interviewPerspective: data.interviewPerspective || '',
          industryPerspective: data.industryPerspective || '',
          prerequisites: data.prerequisites || [],
          learningResources: data.learningResources || [],
          followUpChallenges: data.followUpChallenges || [],
          editorial: data.editorial || null,
        },
      });

      addedCount++;
    }

    // Assign rotations
    await this.assignRotations(week, year);
    return addedCount;
  }

  async assignRotations(week: number, year: number): Promise<void> {
    const weeklyChallenges = await this.prisma.eytChallenge.findMany({
      where: { weekNumber: week, year, qualityScore: { gte: 80 } },
      orderBy: { difficulty: 'asc' },
    });

    if (weeklyChallenges.length === 0) return;

    // Filter out challenges that were used in the last 90 days
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - 90);

    const activeScheduleIds = await this.prisma.eytScheduleLog.findMany({
      where: { scheduledAt: { gte: dateLimit } },
      select: { challengeId: true },
    });
    const scheduledRecently = new Set(activeScheduleIds.map((l) => l.challengeId));

    const candidates = weeklyChallenges.filter((c) => !scheduledRecently.has(c.id));
    const pool = candidates.length > 0 ? candidates : weeklyChallenges;

    const grandChallenge = pool.find((c) => c.difficulty === EytDifficulty.GRAND) || pool[pool.length - 1];
    if (grandChallenge) {
      await this.prisma.eytChallenge.update({
        where: { id: grandChallenge.id },
        data: { isWeekly: true, assignedWeeklyDate: new Date() },
      });
      await this.prisma.eytScheduleLog.create({
        data: { challengeId: grandChallenge.id, type: 'WEEKLY' },
      });
    }

    const dailyChallenge = pool.find((c) => c.difficulty === EytDifficulty.EASY || c.difficulty === EytDifficulty.MEDIUM) || pool[0];
    if (dailyChallenge) {
      await this.prisma.eytChallenge.update({
        where: { id: dailyChallenge.id },
        data: { isDaily: true, assignedDailyDate: new Date() },
      });
      await this.prisma.eytScheduleLog.create({
        data: { challengeId: dailyChallenge.id, type: 'DAILY' },
      });
    }

    const monthlyChallenge = pool.find((c) => c.difficulty === EytDifficulty.EXPERT) || pool[Math.floor(pool.length / 2)];
    if (monthlyChallenge) {
      await this.prisma.eytChallenge.update({
        where: { id: monthlyChallenge.id },
        data: { assignedMonthlyDate: new Date() },
      });
      await this.prisma.eytScheduleLog.create({
        data: { challengeId: monthlyChallenge.id, type: 'MONTHLY' },
      });
    }
  }
}
