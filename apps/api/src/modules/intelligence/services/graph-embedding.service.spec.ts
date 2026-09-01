import { Test, TestingModule } from '@nestjs/testing';
import { GraphEmbeddingService } from './graph-embedding.service';
import { PrismaService } from '../../../prisma/prisma.service';

describe('GraphEmbeddingService (Unit)', () => {
  let service: GraphEmbeddingService;
  let prismaMock: any;

  beforeEach(async () => {
    prismaMock = {
      knowledgeNode: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'node-1', slug: 'data-structures' },
          { id: 'node-2', slug: 'algorithms' },
        ]),
        findUnique: jest.fn().mockResolvedValue({ id: 'node-1', slug: 'data-structures' }),
      },
      knowledgeEdge: {
        findMany: jest.fn().mockResolvedValue([
          { sourceId: 'node-1', targetId: 'node-2', weight: 1.0 },
        ]),
      },
      $executeRawUnsafe: jest.fn().mockResolvedValue(1),
      $queryRawUnsafe: jest.fn().mockResolvedValue([
        { id: 'node-2', name: 'Algorithms', slug: 'algorithms', type: 'CONCEPT', similarity: 0.92 },
      ]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GraphEmbeddingService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<GraphEmbeddingService>(GraphEmbeddingService);
  });

  it('should generate DeepWalk/Node2Vec random walk graph embeddings', async () => {
    const result = await service.generateGraphEmbeddings();
    expect(result.nodesProcessed).toBe(2);
    expect(prismaMock.$executeRawUnsafe).toHaveBeenCalled();
  });

  it('should search similar nodes structurally using pgvector similarity', async () => {
    const results = await service.searchSimilarStructurally('data-structures', 5);
    expect(results.length).toBe(1);
    expect(results[0].slug).toBe('algorithms');
    expect(results[0].similarity).toBeGreaterThan(0.8);
  });
});
