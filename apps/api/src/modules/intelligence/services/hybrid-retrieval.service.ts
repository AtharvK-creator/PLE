import { Injectable, Logger } from '@nestjs/common';
import { GraphService } from './graph.service';
import { VectorSearchService } from './vector-search.service';
import { GraphEmbeddingService } from './graph-embedding.service';
import { StudentContextService } from './student-context.service';
import { ContextBuilderService, RankedItem } from './context-builder.service';

export interface HybridRetrievalResult {
  isSmartPath: boolean;
  promptContext: string;
  rankedItems: RankedItem[];
  executionTimeMs: number;
  mode: 'BASELINE_FAST' | 'VECTOR_ONLY' | 'GRAPH_ONLY' | 'HYBRID' | 'HYBRID_WITH_GRAPH_EMBEDDING';
}

export interface HybridV2ScoringWeights {
  w_graph: number;
  w_vector: number;
  w_graph_embedding: number;
  w_mastery: number;
  w_goal: number;
  w_recency: number;
}

export interface ExperimentFlags {
  enableSmartPath: boolean;
  enableHybridContext: boolean;
  enableGraphEmbeddings: boolean;
}

@Injectable()
export class HybridRetrievalService {
  private readonly logger = new Logger(HybridRetrievalService.name);

  // Experiment Flags (defaults)
  private flags: ExperimentFlags = {
    enableSmartPath: true,
    enableHybridContext: true,
    enableGraphEmbeddings: false, // Set true for Graph Embedding experiment
  };

  // Configurable V2 scoring weights
  private weights: HybridV2ScoringWeights = {
    w_graph: 0.35,
    w_vector: 0.30,
    w_graph_embedding: 0.00, // 0.15 when graph embeddings enabled
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

  /**
   * Updates experiment flags for A/B benchmarking.
   */
  setExperimentFlags(newFlags: Partial<ExperimentFlags>) {
    this.flags = { ...this.flags, ...newFlags };
    if (this.flags.enableGraphEmbeddings) {
      this.weights.w_graph_embedding = 0.15;
    } else {
      this.weights.w_graph_embedding = 0.00;
    }
  }

  /**
   * Updates scoring weights for experimental benchmarks.
   */
  setWeights(newWeights: Partial<HybridV2ScoringWeights>) {
    this.weights = { ...this.weights, ...newWeights };
  }

  /**
   * Deterministic intent detector to differentiate Fast Path vs Smart Path.
   */
  isSmartPathRequest(query: string): boolean {
    if (!this.flags.enableSmartPath || !query) return false;
    const smartKeywords = [
      'explain', 'why', 'how', 'concept', 'prerequisite', 'struggle',
      'recommend', 'learn next', 'understand', 'difference', 'compare',
      'architecture', 'problem', 'solve', 'debug', 'code', 'eyt',
    ];
    const lower = query.toLowerCase();
    return smartKeywords.some((kw) => lower.includes(kw));
  }

  /**
   * Executes Parallel Graph + Text Vector + Graph Embedding Retrieval with Fallback.
   */
  async retrieveHybridContext(
    userId: string,
    userQuery: string,
    forcedSmartPath = false,
  ): Promise<HybridRetrievalResult> {
    const startTime = Date.now();
    const isSmart = forcedSmartPath || this.isSmartPathRequest(userQuery);

    if (!isSmart || !this.flags.enableHybridContext) {
      return {
        isSmartPath: false,
        promptContext: '',
        rankedItems: [],
        executionTimeMs: Date.now() - startTime,
        mode: 'BASELINE_FAST',
      };
    }

    try {
      // Parallel execution of Student Context, Vector Search, Graph Search, and Graph Embedding Search
      const [studentContextResult, vectorDocsResult, graphNodesResult, graphEmbeddingNodesResult] =
        await Promise.allSettled([
          this.studentContextService.buildStudentContext(userId),
          this.vectorSearchService.searchSimilar(userQuery, 5, undefined, userId),
          this.graphService.getRelatedNodes('data-structures', 5),
          this.flags.enableGraphEmbeddings
            ? this.graphEmbeddingService.searchSimilarStructurally('data-structures', 5)
            : Promise.resolve([]),
        ]);

      const studentContext =
        studentContextResult.status === 'fulfilled'
          ? studentContextResult.value
          : {
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

      const vectorDocs = vectorDocsResult.status === 'fulfilled' ? vectorDocsResult.value : [];
      const graphNodes = graphNodesResult.status === 'fulfilled' ? graphNodesResult.value : [];
      const graphEmbeddings =
        graphEmbeddingNodesResult.status === 'fulfilled' ? graphEmbeddingNodesResult.value : [];

      const rankedItems: RankedItem[] = [];

      // Process & score Text Vector Results
      vectorDocs.forEach((doc) => {
        const s_vector = doc.similarity;
        const s_goal = userQuery.toLowerCase().includes(studentContext.careerGoal.toLowerCase()) ? 1.0 : 0.5;
        const s_mastery = studentContext.weakConcepts.some((c) => doc.content.toLowerCase().includes(c.toLowerCase())) ? 1.0 : 0.0;

        const finalScore =
          this.weights.w_vector * s_vector +
          this.weights.w_goal * s_goal +
          this.weights.w_mastery * s_mastery +
          this.weights.w_recency * 1.0;

        rankedItems.push({
          id: doc.id,
          sourceType: 'VECTOR',
          title: `Vector Match (${doc.type})`,
          content: doc.content,
          score: finalScore,
        });
      });

      // Process & score Knowledge Graph Results
      graphNodes.forEach((node) => {
        const s_graph = 1.0 / (node.depth || 1);
        const s_mastery = studentContext.weakConcepts.includes(node.name) ? 1.0 : 0.2;

        const finalScore =
          this.weights.w_graph * s_graph +
          this.weights.w_mastery * s_mastery +
          this.weights.w_recency * 1.0;

        rankedItems.push({
          id: node.id,
          sourceType: 'GRAPH',
          title: `Graph Concept: ${node.name} (${node.type})`,
          content: node.description ?? `Concept ${node.name} in curriculum graph.`,
          score: finalScore,
        });
      });

      // Process & score Graph Embedding Results (Structural Topology Match)
      graphEmbeddings.forEach((ge) => {
        const s_graph_embedding = ge.similarity;
        const finalScore =
          this.weights.w_graph_embedding * s_graph_embedding +
          this.weights.w_recency * 1.0;

        rankedItems.push({
          id: ge.nodeId,
          sourceType: 'GRAPH',
          title: `Structural Graph Match: ${ge.name}`,
          content: `Concept ${ge.name} is structurally connected in knowledge topology (Similarity: ${(ge.similarity * 100).toFixed(1)}%).`,
          score: finalScore,
        });
      });

      // Sort candidate set by multi-factor score descending
      rankedItems.sort((a, b) => b.score - a.score);

      // Build formatted RAG prompt context
      const promptContext = this.contextBuilderService.buildRAGPromptContext(
        studentContext,
        rankedItems,
      );

      const executionTimeMs = Date.now() - startTime;
      const mode = this.flags.enableGraphEmbeddings
        ? 'HYBRID_WITH_GRAPH_EMBEDDING'
        : 'HYBRID';

      this.logger.log(`Hybrid V2 Smart Path executed in ${executionTimeMs}ms (Mode: ${mode})`);

      return {
        isSmartPath: true,
        promptContext,
        rankedItems,
        executionTimeMs,
        mode,
      };
    } catch (err: any) {
      this.logger.error(`Hybrid retrieval V2 error: ${err.message}. Falling back to Fast Path.`);
      return {
        isSmartPath: false,
        promptContext: '',
        rankedItems: [],
        executionTimeMs: Date.now() - startTime,
        mode: 'BASELINE_FAST',
      };
    }
  }
}
