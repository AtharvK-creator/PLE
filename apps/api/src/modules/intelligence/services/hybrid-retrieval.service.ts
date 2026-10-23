import { Injectable, Logger } from '@nestjs/common';
import { GraphService } from './graph.service';
import { VectorSearchService } from './vector-search.service';
import { GraphEmbeddingService } from './graph-embedding.service';
import { StudentContextService } from './student-context.service';
import { ContextBuilderService, RankedItem } from './context-builder.service';

export type SmartPathIntent =
  | 'FAST_PATH'
  | 'TUTOR_CONTEXT'
  | 'PREREQUISITE'
  | 'RECOMMENDATION'
  | 'SKILL_DISCOVERY'
  | 'WEAK_AREA'
  | 'GOAL_BASED'
  | 'GENERAL_RAG';

export interface HybridRetrievalResult {
  isSmartPath: boolean;
  intent: SmartPathIntent;
  promptContext: string;
  rankedItems: RankedItem[];
  executionTimeMs: number;
  telemetry: {
    graphTimeMs: number;
    vectorTimeMs: number;
    studentContextTimeMs: number;
    graphEmbeddingTimeMs: number;
    rankingTimeMs: number;
    totalRetrievalTimeMs: number;
    graphEmbeddingEnabled: boolean;
    fallbacksTriggered: string[];
  };
  mode: 'BASELINE_FAST' | 'VECTOR_ONLY' | 'GRAPH_ONLY' | 'HYBRID' | 'HYBRID_WITH_GRAPH_EMBEDDING';
}

export interface ExperimentFlags {
  enableSmartPath: boolean;
  enableHybridContext: boolean;
  enableGraphEmbeddings: boolean; // MUST be false by default in production
}

@Injectable()
export class HybridRetrievalService {
  private readonly logger = new Logger(HybridRetrievalService.name);

  // Production Default Flags: Architecture D (Hybrid Graph + Vector + Student Context)
  private flags: ExperimentFlags = {
    enableSmartPath: true,
    enableHybridContext: true,
    enableGraphEmbeddings: false, // Disabled by default for production safety
  };

  private readonly weights = {
    w_graph: 0.35,
    w_vector: 0.30,
    w_graph_embedding: 0.00, // Active only when enableGraphEmbeddings=true
    w_mastery: 0.20,
    w_goal: 0.10,
    w_recency: 0.05,
  };

  constructor(
    private readonly graphService: GraphService,
    private readonly vectorSearchService: VectorSearchService,
    private readonly graphEmbeddingService: GraphEmbeddingService,
    private readonly studentContextService: StudentContextService,
    private readonly contextBuilderService: ContextBuilderService,
  ) {}

  setExperimentFlags(newFlags: Partial<ExperimentFlags>) {
    this.flags = { ...this.flags, ...newFlags };
  }

  getExperimentFlags(): ExperimentFlags {
    return { ...this.flags };
  }

  /**
   * Deterministic Intent Detector categorizing queries into production intents.
   */
  detectIntent(query: string): SmartPathIntent {
    if (!query || !this.flags.enableSmartPath) return 'FAST_PATH';
    const lower = query.toLowerCase();

    if (lower.includes('prerequisite') || lower.includes('before') || lower.includes('prior')) return 'PREREQUISITE';
    if (lower.includes('recommend') || lower.includes('learn next') || lower.includes('suggest')) return 'RECOMMENDATION';
    if (lower.includes('skill') || lower.includes('career') || lower.includes('job')) return 'SKILL_DISCOVERY';
    if (lower.includes('struggle') || lower.includes('weak') || lower.includes('help with') || lower.includes('fail')) return 'WEAK_AREA';
    if (lower.includes('goal') || lower.includes('target') || lower.includes('roadmap')) return 'GOAL_BASED';
    if (lower.includes('explain') || lower.includes('why') || lower.includes('how') || lower.includes('concept') || lower.includes('difference')) return 'TUTOR_CONTEXT';

    return 'GENERAL_RAG';
  }

  isSmartPathRequest(query: string): boolean {
    return this.detectIntent(query) !== 'FAST_PATH';
  }

  /**
   * Helper utility wrapping promise calls with bounded execution timeout.
   */
  private async withTimeout<T>(promise: Promise<T>, ms: number, fallbackValue: T): Promise<{ value: T; timeMs: number; timedOut: boolean }> {
    const start = Date.now();
    let timer: NodeJS.Timeout;
    const timeoutPromise = new Promise<{ value: T; timeMs: number; timedOut: boolean }>((resolve) => {
      timer = setTimeout(() => {
        resolve({ value: fallbackValue, timeMs: ms, timedOut: true });
      }, ms);
    });

    try {
      const res = await Promise.race([
        promise.then((val) => ({ value: val, timeMs: Date.now() - start, timedOut: false })),
        timeoutPromise,
      ]);
      clearTimeout(timer!);
      return res;
    } catch (err) {
      clearTimeout(timer!);
      return { value: fallbackValue, timeMs: Date.now() - start, timedOut: true };
    }
  }

  /**
   * Production Parallel Smart Path Retrieval with Telemetry & Bounded Timeouts.
   */
  async retrieveHybridContext(
    userId: string,
    userQuery: string,
    forcedSmartPath = false,
    correlationId?: string,
  ): Promise<HybridRetrievalResult> {
    const startTime = Date.now();
    const intent = forcedSmartPath ? 'TUTOR_CONTEXT' : this.detectIntent(userQuery);

    if (intent === 'FAST_PATH' || !this.flags.enableHybridContext) {
      return {
        isSmartPath: false,
        intent: 'FAST_PATH',
        promptContext: '',
        rankedItems: [],
        executionTimeMs: Date.now() - startTime,
        telemetry: {
          graphTimeMs: 0,
          vectorTimeMs: 0,
          studentContextTimeMs: 0,
          graphEmbeddingTimeMs: 0,
          rankingTimeMs: 0,
          totalRetrievalTimeMs: Date.now() - startTime,
          graphEmbeddingEnabled: false,
          fallbacksTriggered: [],
        },
        mode: 'BASELINE_FAST',
      };
    }

    const fallbacksTriggered: string[] = [];

    // Execute parallel bounded retrieval
    const [ctxRes, vecRes, graphRes, geRes] = await Promise.all([
      this.withTimeout(
        this.studentContextService.buildStudentContext(userId),
        250,
        {
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
        },
      ),
      this.withTimeout(
        this.vectorSearchService.searchSimilar(userQuery, 5, undefined, userId),
        250,
        [],
      ),
      this.withTimeout(
        this.graphService.getRelatedNodes('data-structures', 5),
        250,
        [],
      ),
      this.flags.enableGraphEmbeddings
        ? this.withTimeout(
            this.graphEmbeddingService.searchSimilarStructurally('data-structures', 5),
            250,
            [],
          )
        : Promise.resolve({ value: [], timeMs: 0, timedOut: false }),
    ]);

    if (ctxRes.timedOut) fallbacksTriggered.push('STUDENT_CONTEXT_TIMEOUT');
    if (vecRes.timedOut) fallbacksTriggered.push('VECTOR_SEARCH_TIMEOUT');
    if (graphRes.timedOut) fallbacksTriggered.push('GRAPH_SEARCH_TIMEOUT');
    if (geRes.timedOut) fallbacksTriggered.push('GRAPH_EMBEDDING_TIMEOUT');

    const rankingStart = Date.now();
    const rankedItems: RankedItem[] = [];
    const studentContext = ctxRes.value;

    // Rank Text Vector Candidates
    vecRes.value.forEach((doc) => {
      const s_vector = doc.similarity;
      const s_goal = userQuery.toLowerCase().includes(studentContext.careerGoal.toLowerCase()) ? 1.0 : 0.5;
      const s_mastery = studentContext.weakConcepts.some((c) => doc.content.toLowerCase().includes(c.toLowerCase())) ? 1.0 : 0.0;
      const finalScore = 0.30 * s_vector + 0.10 * s_goal + 0.20 * s_mastery + 0.05;

      rankedItems.push({
        id: doc.id,
        sourceType: 'VECTOR',
        title: `Vector Match (${doc.type})`,
        content: doc.content,
        score: finalScore,
      });
    });

    // Rank Knowledge Graph Candidates
    graphRes.value.forEach((node) => {
      const s_graph = 1.0 / (node.depth || 1);
      const s_mastery = studentContext.weakConcepts.includes(node.name) ? 1.0 : 0.2;
      const finalScore = 0.35 * s_graph + 0.20 * s_mastery + 0.05;

      rankedItems.push({
        id: node.id,
        sourceType: 'GRAPH',
        title: `Graph Concept: ${node.name} (${node.type})`,
        content: node.description ?? `Concept ${node.name} in curriculum graph.`,
        score: finalScore,
      });
    });

    // Rank Graph Embedding Candidates (Only if feature flag enabled)
    if (this.flags.enableGraphEmbeddings) {
      geRes.value.forEach((ge) => {
        const s_ge = ge.similarity;
        const finalScore = 0.15 * s_ge + 0.05;
        rankedItems.push({
          id: ge.nodeId,
          sourceType: 'GRAPH',
          title: `Structural Graph Match: ${ge.name}`,
          content: `Concept ${ge.name} is structurally connected in knowledge topology.`,
          score: finalScore,
        });
      });
    }

    rankedItems.sort((a, b) => b.score - a.score);

    const promptContext = this.contextBuilderService.buildRAGPromptContext(studentContext, rankedItems);
    const rankingTimeMs = Date.now() - rankingStart;
    const totalRetrievalTimeMs = Date.now() - startTime;

    this.logger.log(
      `[CorrelationId: ${correlationId || 'N/A'}] Smart Path Executed: intent=${intent}, totalTime=${totalRetrievalTimeMs}ms, graphTime=${graphRes.timeMs}ms, vectorTime=${vecRes.timeMs}ms, contextTime=${ctxRes.timeMs}ms, fallbacks=[${fallbacksTriggered.join(',')}]`,
    );

    return {
      isSmartPath: true,
      intent,
      promptContext,
      rankedItems,
      executionTimeMs: totalRetrievalTimeMs,
      telemetry: {
        graphTimeMs: graphRes.timeMs,
        vectorTimeMs: vecRes.timeMs,
        studentContextTimeMs: ctxRes.timeMs,
        graphEmbeddingTimeMs: geRes.timeMs,
        rankingTimeMs,
        totalRetrievalTimeMs,
        graphEmbeddingEnabled: this.flags.enableGraphEmbeddings,
        fallbacksTriggered,
      },
      mode: this.flags.enableGraphEmbeddings ? 'HYBRID_WITH_GRAPH_EMBEDDING' : 'HYBRID',
    };
  }
}
