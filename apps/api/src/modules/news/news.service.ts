import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { AIGatewayService } from '../ai-gateway/ai-gateway.service';
import { NewsProvider } from './providers/news-provider.interface';
import { NewsAPIProvider } from './providers/newsapi.provider';

export interface Article {
  title: string;
  url: string;
  source: string;
  imageUrl?: string;
  summary?: string;
  publishedAt: string;
  category?: string;
  cachedAt?: string;
  relevanceScore?: number;
}

// Global Excluded Keywords for Backend Post-Filtering
const EXCLUDED_KEYWORDS = [
  'politics', 'politician', 'election', 'senate', 'parliament', 'congress', 'democrat', 'republican',
  'sports', 'football', 'soccer', 'basketball', 'cricket', 'nfl', 'nba', 'olympics', 'baseball', 'tennis',
  'entertainment', 'celebrity', 'celebrities', 'hollywood', 'bollywood', 'movie', 'cinema',
  'music', 'song', 'album', 'actor', 'actress', 'gossip', 'fashion', 'runway', 'tv show',
  'pop star', 'scandal', 'royal family', 'kardashian', 'celebrate',
  'travel', 'flight', 'hotel', 'vacation', 'cruise', 'tourist', 'deal', 'shopping', 'coupon', 'promo code', 'discount'
];

// Low-quality/unrelated source blacklist
const SOURCE_BLACKLIST = [
  'theflightdeal.com', 'the flight deal', 'flyertalk', 'nomadicmatt', 'travelweekly',
  'espn', 'bleacherreport', 'sportsillustrated', 'tmz', 'hollywoodreporter',
  'variety', 'people.com', 'eonline', 'dailymail', 'buzzfeed', 'huffpost',
  'slickdeals', 'slickdeals.net', 'groupon', 'retailmenot'
];

// Whitelist sources
const SOURCE_WHITELIST = [
  'techcrunch', 'the verge', 'ars technica', 'mit technology review', 'ieee',
  'hacker news', 'github blog', 'openai', 'google ai blog', 'nvidia',
  'microsoft', 'aws', 'infoq'
];

// Keywords for Tech Relevance Scoring
const TECH_KEYWORDS = [
  'ai', 'machine learning', 'deep learning', 'llm', 'generative ai', 'neural network',
  'software engineering', 'programming', 'developer', 'coding', 'development',
  'cloud', 'aws', 'azure', 'serverless', 'kubernetes', 'docker',
  'cybersecurity', 'infosec', 'security', 'encryption', 'zero trust',
  'open source', 'github', 'git',
  'startups', 'ycombinator', 'founder', 'funding',
  'developer tools', 'compiler', 'database', 'api',
  'career', 'hiring', 'interview', 'internship', 'placement'
];

@Injectable()
export class NewsService {
  private readonly logger = new Logger(NewsService.name);
  private readonly apiKey: string;
  private readonly provider: NewsProvider;
  private cache = new Map<string, { data: Article[]; timestamp: number }>();
  private readonly CACHE_TTL = 15 * 60 * 1000; // 15 minutes cache TTL

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly aiGateway: AIGatewayService,
  ) {
    this.apiKey = this.config.get<string>('NEWSAPI_KEY') || '';
    this.provider = new NewsAPIProvider(this.apiKey);
  }

  // Get Tech/Engineering/AI News with Caching, Filtering, and Prioritization
  async getNews(category = 'technology', search = ''): Promise<Article[]> {
    const cacheKey = `${category.toLowerCase()}:${search.toLowerCase()}:latest`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      this.logger.log(`Returning cached news for key: ${cacheKey}`);
      return cached.data;
    }

    if (!this.apiKey) {
      this.logger.warn('NEWSAPI_KEY is not set. Returning mock fallback articles.');
      const mockData = this.getMockFallbackNews(category, search);
      const processed = this.processAndSortArticles(mockData, category, Date.now());
      this.cache.set(cacheKey, { data: processed, timestamp: Date.now() });
      return processed;
    }

    try {
      this.logger.log(`Fetching live news for category: ${category}, search: ${search}`);
      const rawArticles = await this.provider.fetchNews(category, search, 'publishedAt');
      const processed = this.processAndSortArticles(rawArticles, category, Date.now());
      this.cache.set(cacheKey, { data: processed, timestamp: Date.now() });
      return processed;
    } catch (e: any) {
      this.logger.error(`Failed to fetch live news (${e.message}). Checking expired cache fallback...`);
      
      if (cached) {
        this.logger.warn(`Fallback: Returning expired cached news for key: ${cacheKey}`);
        return cached.data;
      }
      
      this.logger.warn(`Fallback: No cache found. Returning mock fallback articles.`);
      const mockData = this.getMockFallbackNews(category, search);
      const processed = this.processAndSortArticles(mockData, category, Date.now());
      this.cache.set(cacheKey, { data: processed, timestamp: Date.now() });
      return processed;
    }
  }

  // Get Trending News (Sorted by Popularity)
  async getTrendingNews(): Promise<Article[]> {
    const cacheKey = 'trending:popular';
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    if (!this.apiKey) {
      const mockData = [
        ...this.getMockFallbackNews('ai'),
        ...this.getMockFallbackNews('technology'),
        ...this.getMockFallbackNews('engineering'),
      ];
      const processed = this.processAndSortArticles(mockData, 'technology', Date.now()).slice(0, 5);
      this.cache.set(cacheKey, { data: processed, timestamp: Date.now() });
      return processed;
    }

    try {
      this.logger.log('Fetching live trending news sorted by popularity');
      const rawArticles = await this.provider.fetchNews('technology', '', 'popularity');
      const processed = this.processAndSortArticles(rawArticles, 'technology', Date.now()).slice(0, 5);
      this.cache.set(cacheKey, { data: processed, timestamp: Date.now() });
      return processed;
    } catch (e: any) {
      this.logger.error(`Failed to fetch live trending news (${e.message}). Checking expired cache fallback...`);
      if (cached) {
        return cached.data;
      }
      const mockData = [
        ...this.getMockFallbackNews('ai'),
        ...this.getMockFallbackNews('technology'),
      ];
      const processed = this.processAndSortArticles(mockData, 'technology', Date.now()).slice(0, 5);
      this.cache.set(cacheKey, { data: processed, timestamp: Date.now() });
      return processed;
    }
  }

  // Get AI Watch News (OpenAI, Google DeepMind, Anthropic, NVIDIA, Meta AI, Microsoft AI, AWS AI)
  async getAIWatchNews(): Promise<Article[]> {
    const aiArticles = await this.getNews('ai');
    const aiLabs = ['openai', 'deepmind', 'anthropic', 'nvidia', 'meta ai', 'microsoft ai', 'aws ai', 'amazon q'];
    
    return aiArticles.filter(art => {
      const text = `${art.title} ${art.summary || ''}`.toLowerCase();
      return aiLabs.some(lab => text.includes(lab));
    });
  }

  // Get Personalized "For You" News Feed using rich profile context
  async getPersonalizedNews(userId: string): Promise<Article[]> {
    // 1. Fetch user profile, skills, roadmaps, and quiz weak areas
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    const userSkills = await this.prisma.userSkill.findMany({
      where: { userId },
      include: { skill: true },
    });

    const activeRoadmap = await this.prisma.roadmap.findFirst({
      where: { userId, status: 'ACTIVE' },
    });

    const weakAnswers = await this.prisma.attemptAnswer.findMany({
      where: {
        attempt: { userId },
        isCorrect: false,
      },
      include: {
        question: {
          include: {
            quiz: true,
          },
        },
      },
    });

    // 2. Build user-personalized keyword list
    const keywords: string[] = [];
    if (profile) {
      if (profile.branch) keywords.push(profile.branch.toLowerCase());
      if (profile.careerGoal) {
        const goal = profile.careerGoal.toLowerCase();
        keywords.push(...goal.split(/\s+/));
        if (goal.includes('ai') || goal.includes('machine learning') || goal.includes('data')) {
          keywords.push('ai', 'machine learning', 'openai', 'nvidia', 'huggingface', 'anthropic', 'pytorch', 'tensorflow');
        }
        if (goal.includes('web') || goal.includes('frontend') || goal.includes('react') || goal.includes('fullstack')) {
          keywords.push('react', 'next.js', 'vercel', 'frontend', 'javascript', 'typescript', 'web');
        }
        if (goal.includes('backend') || goal.includes('cloud') || goal.includes('devops') || goal.includes('database') || goal.includes('system')) {
          keywords.push('backend', 'cloud', 'database', 'devops', 'kubernetes', 'docker', 'api', 'databases', 'aws', 'azure');
        }
      }
      if (profile.knowledgeDomains) {
        profile.knowledgeDomains.forEach(kd => keywords.push(kd.toLowerCase()));
      }
    }

    userSkills.forEach(us => {
      keywords.push(us.skill.name.toLowerCase());
    });

    if (activeRoadmap) {
      keywords.push(...activeRoadmap.title.toLowerCase().split(/\s+/));
    }

    weakAnswers.forEach(wa => {
      const topic = wa.question.quiz.topic.toLowerCase();
      keywords.push(topic);
      keywords.push(...topic.split(/\s+/));
    });

    // Deduplicate and clean keywords
    const cleanKeywords = Array.from(new Set(keywords.filter(kw => kw.length > 2)));

    // 3. Fetch from core tech categories
    const categoriesToFetch = ['ai', 'programming', 'cloud', 'technology'];
    const allArticles: Article[] = [];

    for (const cat of categoriesToFetch) {
      try {
        const catArticles = await this.getNews(cat);
        allArticles.push(...catArticles);
      } catch (err: any) {
        this.logger.warn(`Failed to fetch ${cat} for personalized feed: ${err.message}`);
      }
    }

    // 4. Deduplicate
    const uniqueArticles = this.deduplicateArticles(allArticles);

    // 5. Score and Sort
    return uniqueArticles
      .map(art => {
        const text = `${art.title} ${art.summary || ''}`.toLowerCase();
        let personalScore = 0;
        cleanKeywords.forEach(kw => {
          if (text.includes(kw)) {
            personalScore += 5; // high weight for personal match
          }
        });
        const techScore = this.computeTechRelevanceScore(art);
        const totalScore = techScore + personalScore;
        const percentage = Math.min(60 + (totalScore * 5), 99);
        return {
          ...art,
          relevanceScore: percentage,
        };
      })
      .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
      .slice(0, 10);
  }

  // Get Saved Articles
  async getSavedArticles(userId: string) {
    return this.prisma.savedArticle.findMany({
      where: { userId },
      orderBy: { savedAt: 'desc' },
    });
  }

  // Save an Article
  async saveArticle(userId: string, dto: { title: string; url: string; source?: string; imageUrl?: string; summary?: string; category?: string; publishedAt?: string }) {
    const existing = await this.prisma.savedArticle.findFirst({
      where: { userId, url: dto.url },
    });
    if (existing) {
      return existing;
    }
    return this.prisma.savedArticle.create({
      data: {
        userId,
        title: dto.title,
        url: dto.url,
        source: dto.source || null,
        imageUrl: dto.imageUrl || null,
        summary: dto.summary || null,
        category: dto.category || 'technology',
        publishedAt: dto.publishedAt ? new Date(dto.publishedAt) : null,
        savedAt: new Date(),
      },
    });
  }

  // Unsave an Article
  async unsaveArticle(userId: string, id: string) {
    const existing = await this.prisma.savedArticle.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      throw new BadRequestException('Article not saved or not owned by you');
    }
    await this.prisma.savedArticle.delete({
      where: { id },
    });
    return { success: true };
  }

  // Summarize a news article with MIKE
  async summarizeArticle(userId: string, dto: { title: string; url: string; summary?: string }) {
    const systemPrompt = `You are MIKE (Mentor for Intelligent Knowledge & Empowerment), acting as a Senior Software Engineer and Technical Mentor.
Your task is to summarize the following tech news article for students in an extremely minimal, pointwise, and clean format.
The entire response must be highly concise, equivalent to around 2 paragraphs of text in total.

You must return your response structured in these exact markdown sections:

# ${dto.title}

## Key Takeaways
- [Bullet 1: Core news event and tech context]
- [Bullet 2: Engineering significance or architectural change]

## Skills You Should Learn
- [Bullet 1: Specific skills, tools, or concepts to build]

## Career Impact
- [Bullet 1: Concise impact on internships, placements, or SDE roles]

## Recommended Next Learning Step
- [Bullet 1: Single actionable study recommendation or project concept]

Formatting Rules:
- Every section under a heading MUST consist only of short bullet points (no paragraphs or plain text blocks).
- Limit each bullet point to 1-2 short sentences.
- Prioritize extreme brevity and direct educational relevance.`;

    const articleContext = `Article Title: ${dto.title}\nArticle URL: ${dto.url}\nArticle Summary: ${dto.summary || 'None provided'}`;

    try {
      const result = await this.aiGateway.generate(
        'tutor',
        articleContext,
        systemPrompt,
      );
      return { summary: result.content };
    } catch (err: any) {
      this.logger.error(`MIKE News Summary failed: ${err.message}`);
      throw new BadRequestException('Failed to summarize article with MIKE');
    }
  }

  // Process and sort articles according to whitelist priority, relevance score, and publishedAt DESC
  private processAndSortArticles(articles: Article[], category: string, cachedTimestamp: number): Article[] {
    // 1. Map category
    const mapped = articles.map(art => ({ ...art, category }));

    // 2. Filter allowed articles (quality filter)
    const filtered = mapped.filter(art => this.isAllowedArticle(art));

    // 3. Deduplicate
    const unique = this.deduplicateArticles(filtered);

    // 4. Freshness Filter: Fetch only from last 24 hours
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    let freshArticles = unique.filter(art => {
      const pubTime = new Date(art.publishedAt).getTime();
      return now - pubTime <= oneDayMs;
    });

    // 5. Fallback: If no articles are within the last 24 hours, fall back to returning the newest available articles instead of empty list
    if (freshArticles.length === 0) {
      this.logger.warn(`No fresh articles in category ${category} in the last 24h. Falling back to newest available.`);
      freshArticles = unique;
    }

    // 6. Source Cap: Limit to maximum 3 articles per source
    const sourceCount = new Map<string, number>();
    const sourceCapped: Article[] = [];
    for (const art of freshArticles) {
      const src = (art.source || 'Unknown').toLowerCase().trim();
      const count = sourceCount.get(src) || 0;
      if (count < 3) {
        sourceCapped.push(art);
        sourceCount.set(src, count + 1);
      }
    }

    // 7. Calculate relevance score and Sort
    const cachedAtStr = new Date(cachedTimestamp).toISOString();
    return sourceCapped
      .map(art => {
        const score = this.computeTechRelevanceScore(art);
        const percentage = Math.min(60 + (score * 8), 99);
        return {
          ...art,
          relevanceScore: percentage,
          cachedAt: cachedAtStr,
        };
      })
      .sort((a, b) => {
        // A. Whitelisted source priority
        const aWhitelisted = this.isSourceWhitelisted(a.source);
        const bWhitelisted = this.isSourceWhitelisted(b.source);
        if (aWhitelisted && !bWhitelisted) return -1;
        if (!aWhitelisted && bWhitelisted) return 1;

        // B. Tech relevance score
        const aRel = a.relevanceScore || 0;
        const bRel = b.relevanceScore || 0;
        if (bRel !== aRel) return bRel - aRel;

        // C. publishedAt DESC
        return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
      });
  }

  // Deduplicate by URL and normalized Title
  private deduplicateArticles(articles: Article[]): Article[] {
    const seenUrls = new Set<string>();
    const seenTitles = new Set<string>();
    const unique: Article[] = [];

    for (const art of articles) {
      const url = art.url.trim().toLowerCase();
      const normalizedTitle = art.title
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .trim();

      if (seenUrls.has(url)) continue;
      if (seenTitles.has(normalizedTitle)) continue;

      seenUrls.add(url);
      seenTitles.add(normalizedTitle);
      unique.push(art);
    }
    return unique;
  }

  // Compute base tech relevance score
  private computeTechRelevanceScore(article: Article): number {
    const text = `${article.title} ${article.summary || ''}`.toLowerCase();
    let score = 0;
    TECH_KEYWORDS.forEach(kw => {
      const regex = new RegExp(`\\b${kw}\\b`, 'gi');
      const matches = text.match(regex);
      if (matches) {
        score += matches.length;
      }
    });
    return score;
  }

  // Check if article source is whitelisted
  private isSourceWhitelisted(sourceName: string): boolean {
    const lower = (sourceName || '').toLowerCase().trim();
    return SOURCE_WHITELIST.some(w => lower.includes(w));
  }

  // Post-filter to block politics, sports, entertainment, travel, and shopping
  private isAllowedArticle(article: Article): boolean {
    const text = `${article.title} ${article.summary || ''}`.toLowerCase();
    const sourceLower = (article.source || '').toLowerCase();
    
    if (EXCLUDED_KEYWORDS.some(kw => text.includes(kw))) {
      return false;
    }
    
    if (SOURCE_BLACKLIST.some(bl => sourceLower.includes(bl))) {
      return false;
    }
    
    return true;
  }

  // Mock fallbacks for all allowed categories (with whitelisted sources and relative today/yesterday timestamps)
  private getMockFallbackNews(category: string, search = ''): Article[] {
    const nowMs = Date.now();
    const allMocks: Record<string, Article[]> = {
      ai: [
        {
          title: 'OpenAI Launches Advanced Reasoning Models for SDE Problem Solving',
          url: 'https://ple.app/news/openai-advanced-sde',
          source: 'OpenAI',
          imageUrl: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?w=500&auto=format&fit=crop&q=60',
          summary: 'OpenAI unveils its latest AI agent model focusing on step-by-step reasoning, excelling in algorithms, debugging, and system design evaluations.',
          publishedAt: new Date(nowMs - 3600 * 1000).toISOString(), // 1 hour ago (Today)
        },
        {
          title: 'NVIDIA Breakthrough: Next-Gen GPU Clusters Reduce LLM Inference Cost by 80%',
          url: 'https://ple.app/news/nvidia-gpu-inference-cost',
          source: 'NVIDIA',
          imageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=500&auto=format&fit=crop&q=60',
          summary: 'NVIDIA reveals its next-generation architecture featuring hardware acceleration for mixture-of-experts model runs, slashing latency and server cost.',
          publishedAt: new Date(nowMs - 5 * 3600 * 1000).toISOString(), // 5 hours ago (Today)
        },
        {
          title: 'Google DeepMind: AlphaCode 3 Achieves Expert Rating in Competitive Programming',
          url: 'https://ple.app/news/deepmind-alphacode-3',
          source: 'Google AI Blog',
          imageUrl: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=500&auto=format&fit=crop&q=60',
          summary: 'AlphaCode 3 solves complex data structures and dynamic programming queries at competitive programmer levels in international code reviews.',
          publishedAt: new Date(nowMs - 10 * 3600 * 1000).toISOString(), // 10 hours ago (Today)
        }
      ],
      programming: [
        {
          title: 'GitHub Blog: Copilot Workspace Enters General Availability with Local Git Integration',
          url: 'https://ple.app/news/github-copilot-workspace',
          source: 'GitHub Blog',
          imageUrl: 'https://images.unsplash.com/photo-1607799279861-4dd421887fb3?w=500&auto=format&fit=crop&q=60',
          summary: 'GitHub officially releases Workspace, an agentic environment letting developers describe tasks in markdown and letting agents edit local source code.',
          publishedAt: new Date(nowMs - 2 * 3600 * 1000).toISOString(), // 2 hours ago (Today)
        },
        {
          title: 'InfoQ: TypeScript 6.0 Announces Zero-Cost Type Checking and Fast Build Compilers',
          url: 'https://ple.app/news/typescript-6-zero-cost',
          source: 'InfoQ',
          imageUrl: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=500&auto=format&fit=crop&q=60',
          summary: 'The TypeScript compiler gets rebuilt in Rust, leading to 10x faster hot reload and type checking speeds in Next.js development projects.',
          publishedAt: new Date(nowMs - 16 * 3600 * 1000).toISOString(), // 16 hours ago (Today)
        }
      ],
      technology: [
        {
          title: 'TechCrunch: Y Combinator Winter Cohort Tech Trends Highlight Agentic Developer Tools',
          url: 'https://ple.app/news/techcrunch-yc-trends',
          source: 'TechCrunch',
          imageUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=500&auto=format&fit=crop&q=60',
          summary: 'Over half of the startups pitching in YC focus on developer automation, agentic coding microsegmentation, and post-quantum browser authentication.',
          publishedAt: new Date(nowMs - 4 * 3600 * 1000).toISOString(), // 4 hours ago (Today)
        },
        {
          title: 'Ars Technica: The Rise of Compiled Frameworks and Serverless Edge Components',
          url: 'https://ple.app/news/ars-compiled-frameworks',
          source: 'Ars Technica',
          imageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=500&auto=format&fit=crop&q=60',
          summary: 'A deep-dive on how modern browser engines and serverless compilers remove bundle size constraints for edge deployment architectures.',
          publishedAt: new Date(nowMs - 20 * 3600 * 1000).toISOString(), // 20 hours ago (Today)
        }
      ],
      engineering: [
        {
          title: 'IEEE: Scaling Distributed Databases to Millions of Requests with Zero Lag',
          url: 'https://ple.app/news/ieee-distributed-db',
          source: 'IEEE',
          imageUrl: 'https://images.unsplash.com/photo-1591453089816-0fbb971b454c?w=500&auto=format&fit=crop&q=60',
          summary: 'IEEE publishes engineering guidelines on multi-region active-active database clusters, testing network partitions and consensus protocols.',
          publishedAt: new Date(nowMs - 8 * 3600 * 1000).toISOString(), // 8 hours ago (Today)
        }
      ],
      cloud: [
        {
          title: 'AWS Cloud Architecture: Designing High-Availability Edge Circuits at Scale',
          url: 'https://ple.app/news/aws-high-availability',
          source: 'AWS',
          imageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=500&auto=format&fit=crop&q=60',
          summary: 'AWS engineers release architectural blueprints for multi-tenant microsegmentation, circuit breakers, and rate-limiting at regional cloud clusters.',
          publishedAt: new Date(nowMs - 6 * 3600 * 1000).toISOString(), // 6 hours ago (Today)
        }
      ],
      cybersecurity: [
        {
          title: 'MIT Technology Review: Zero-Trust Network Protocols and Cryptographic Defense',
          url: 'https://ple.app/news/mit-zero-trust',
          source: 'MIT Technology Review',
          imageUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=500&auto=format&fit=crop&q=60',
          summary: 'Analyzing zero-trust network protocols, identity-based microsegmentation, and zero-knowledge proofs for safeguarding distributed microservices.',
          publishedAt: new Date(nowMs - 12 * 3600 * 1000).toISOString(), // 12 hours ago (Today)
        }
      ],
      startups: [
        {
          title: 'Hacker News: Startup Fundraising Climbs as AI Developer Platforms Secure Capital',
          url: 'https://ple.app/news/hn-fundraising-developer',
          source: 'Hacker News',
          imageUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=500&auto=format&fit=crop&q=60',
          summary: 'Hacker News tracks startup cohorts securing Series A funding for building compilers, edge API Gateways, and high-concurrency databases.',
          publishedAt: new Date(nowMs - 3 * 3600 * 1000).toISOString(), // 3 hours ago (Today)
        }
      ],
      industry: [
        {
          title: 'The Verge: Chipmaker Consolidation Increases Pressure on Custom Silicon TPU Deployments',
          url: 'https://ple.app/news/verge-chip-custom-silicon',
          source: 'The Verge',
          imageUrl: 'https://images.unsplash.com/photo-1591453089816-0fbb971b454c?w=500&auto=format&fit=crop&q=60',
          summary: 'Major cloud providers Meta, Microsoft, Google, and Amazon expand deployment of internally designed ASICs and TPUs for inference cycles.',
          publishedAt: new Date(nowMs - 14 * 3600 * 1000).toISOString(), // 14 hours ago (Today)
        }
      ],
      companies: [
        {
          title: 'Google AI Blog: Introducing Gemini 2.0 Ultra with Multi-Modal Code Synthesis',
          url: 'https://ple.app/news/google-gemini-2-ultra',
          source: 'Google AI Blog',
          imageUrl: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=500&auto=format&fit=crop&q=60',
          summary: 'Google launches Gemini 2.0 Ultra, showcasing massive context windows and real-time execution simulation for frontend and backend coding reviews.',
          publishedAt: new Date(nowMs - 11 * 3600 * 1000).toISOString(), // 11 hours ago (Today)
        }
      ],
      careers: [
        {
          title: 'TechCrunch: Tech Hiring Trends in 2026 Prioritize Full-Stack and Systems Engineering',
          url: 'https://ple.app/news/techcrunch-hiring-trends',
          source: 'TechCrunch',
          imageUrl: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=500&auto=format&fit=crop&q=60',
          summary: 'Recent global tech recruiter statistics show that software engineering placements demand typescript, cloud architecture, and database performance tuning.',
          publishedAt: new Date(nowMs - 7 * 3600 * 1000).toISOString(), // 7 hours ago (Today)
        }
      ]
    };

    const categoryMocks = allMocks[category.toLowerCase()] || allMocks['technology'];
    
    if (search.trim()) {
      const q = search.toLowerCase();
      return categoryMocks.filter(art => 
        art.title.toLowerCase().includes(q) || 
        art.summary?.toLowerCase().includes(q)
      );
    }
    return categoryMocks;
  }
}
