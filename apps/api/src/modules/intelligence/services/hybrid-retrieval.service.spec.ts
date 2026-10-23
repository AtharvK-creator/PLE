import { Test, TestingModule } from '@nestjs/testing';
import { HybridRetrievalService } from './hybrid-retrieval.service';
import { GraphService } from './graph.service';
import { VectorSearchService } from './vector-search.service';
import { GraphEmbeddingService } from './graph-embedding.service';
import { StudentContextService } from './student-context.service';
import { ContextBuilderService } from './context-builder.service';

describe('HybridRetrievalService (Unit & Production Smart Path)', () => {
  let service: HybridRetrievalService;
  let graphServiceMock: any;
  let vectorSearchServiceMock: any;
  let graphEmbeddingServiceMock: any;
  let studentContextServiceMock: any;

  beforeEach(async () => {
    graphServiceMock = {
      getRelatedNodes: jest.fn().mockResolvedValue([
        { id: 'node-1', name: 'Data Structures', slug: 'data-structures', type: 'CONCEPT', description: 'Core concept', depth: 1 },
      ]),
    };

    vectorSearchServiceMock = {
      searchSimilar: jest.fn().mockResolvedValue([
        { id: 'vec-1', userId: 'user-1', type: 'KNOWLEDGE', referenceId: 'ref-1', content: 'Vector chunk', similarity: 0.88, metadata: {} },
      ]),
    };

    graphEmbeddingServiceMock = {
      searchSimilarStructurally: jest.fn().mockResolvedValue([
        { nodeId: 'node-2', name: 'Algorithms', slug: 'algorithms', type: 'CONCEPT', similarity: 0.95 },
      ]),
    };

    studentContextServiceMock = {
      buildStudentContext: jest.fn().mockResolvedValue({
        userId: 'user-1',
        careerGoal: 'Full Stack Engineer',
        branch: 'Computer Science',
        semester: 6,
        thinkingScore: 85,
        thinkingLevel: 'INTERMEDIATE',
        masteredSkills: ['C Programming'],
        learningSkills: ['Pointers'],
        weakConcepts: ['Dynamic Memory'],
        struggledQuestions: ['Explain malloc memory leaks'],
        recentQuizScores: [80, 90],
        activeRoadmapTitle: '6-Month Software Engineer',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HybridRetrievalService,
        ContextBuilderService,
        { provide: GraphService, useValue: graphServiceMock },
        { provide: VectorSearchService, useValue: vectorSearchServiceMock },
        { provide: GraphEmbeddingService, useValue: graphEmbeddingServiceMock },
        { provide: StudentContextService, useValue: studentContextServiceMock },
      ],
    }).compile();

    service = module.get<HybridRetrievalService>(HybridRetrievalService);
  });

  it('should classify intents correctly', () => {
    expect(service.detectIntent('')).toBe('FAST_PATH');
    expect(service.detectIntent('What prerequisites are required for linked lists?')).toBe('PREREQUISITE');
    expect(service.detectIntent('Recommend skills for backend engineer')).toBe('RECOMMENDATION');
    expect(service.detectIntent('Explain pointers and memory allocation')).toBe('TUTOR_CONTEXT');
  });

  it('should execute parallel retrieval in HYBRID mode with telemetry', async () => {
    const result = await service.retrieveHybridContext('user-1', 'Explain pointers and dynamic memory', false, 'test-req-123');
    expect(result.isSmartPath).toBe(true);
    expect(result.intent).toBe('TUTOR_CONTEXT');
    expect(result.mode).toBe('HYBRID');
    expect(result.telemetry.totalRetrievalTimeMs).toBeGreaterThanOrEqual(0);
    expect(result.telemetry.graphEmbeddingEnabled).toBe(false);
  });

  it('should respect enableGraphEmbeddings flag when enabled experimentally', async () => {
    service.setExperimentFlags({ enableGraphEmbeddings: true });
    const result = await service.retrieveHybridContext('user-1', 'Explain pointers and dynamic memory', false, 'test-req-456');
    expect(result.isSmartPath).toBe(true);
    expect(result.mode).toBe('HYBRID_WITH_GRAPH_EMBEDDING');
    expect(result.telemetry.graphEmbeddingEnabled).toBe(true);
  });
});
