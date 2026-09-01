import { Test, TestingModule } from '@nestjs/testing';
import { HybridRetrievalService } from './hybrid-retrieval.service';
import { GraphService } from './graph.service';
import { VectorSearchService } from './vector-search.service';
import { GraphEmbeddingService } from './graph-embedding.service';
import { StudentContextService } from './student-context.service';
import { ContextBuilderService } from './context-builder.service';

describe('HybridRetrievalService (Unit & Smart Path V2)', () => {
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

  it('should differentiate Fast Path vs Smart Path requests', () => {
    expect(service.isSmartPathRequest('Submit quiz answer')).toBe(false);
    expect(service.isSmartPathRequest('Explain pointers and memory allocation')).toBe(true);
  });

  it('should execute parallel Graph + Vector retrieval in HYBRID mode', async () => {
    const result = await service.retrieveHybridContext('user-1', 'Explain pointers and dynamic memory');
    expect(result.isSmartPath).toBe(true);
    expect(result.mode).toBe('HYBRID');
    expect(result.rankedItems.length).toBeGreaterThan(0);
    expect(graphServiceMock.getRelatedNodes).toHaveBeenCalled();
    expect(vectorSearchServiceMock.searchSimilar).toHaveBeenCalled();
  });

  it('should execute Graph Embedding retrieval when enableGraphEmbeddings flag is set', async () => {
    service.setExperimentFlags({ enableGraphEmbeddings: true });
    const result = await service.retrieveHybridContext('user-1', 'Explain pointers and dynamic memory');
    expect(result.isSmartPath).toBe(true);
    expect(result.mode).toBe('HYBRID_WITH_GRAPH_EMBEDDING');
    expect(graphEmbeddingServiceMock.searchSimilarStructurally).toHaveBeenCalled();
  });

  it('should gracefully fallback to Fast Path if parallel retrieval encounters error', async () => {
    graphServiceMock.getRelatedNodes.mockRejectedValueOnce(new Error('DB failure'));
    vectorSearchServiceMock.searchSimilar.mockRejectedValueOnce(new Error('Vector failure'));

    const result = await service.retrieveHybridContext('user-1', 'Explain pointers');
    expect(result.isSmartPath).toBe(true);
    expect(result.promptContext).toBeDefined();
  });
});
