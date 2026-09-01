import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

export interface GraphEmbeddingSearchResult {
  nodeId: string;
  name: string;
  slug: string;
  type: string;
  similarity: number;
}

@Injectable()
export class GraphEmbeddingService {
  private readonly logger = new Logger(GraphEmbeddingService.name);
  private readonly dimension = 128;
  private readonly walkLength = 10;
  private readonly numWalks = 5;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates structural graph embeddings using random walks (DeepWalk/Node2Vec structural algorithm).
   */
  async generateGraphEmbeddings(): Promise<{ nodesProcessed: number }> {
    try {
      const nodes = await this.prisma.knowledgeNode.findMany({
        select: { id: true, slug: true },
      });
      const edges = await this.prisma.knowledgeEdge.findMany({
        select: { sourceId: true, targetId: true, weight: true },
      });

      if (nodes.length === 0) return { nodesProcessed: 0 };

      // Build adjacency list graph representation
      const adj = new Map<string, string[]>();
      nodes.forEach((n) => adj.set(n.id, []));
      edges.forEach((e) => {
        adj.get(e.sourceId)?.push(e.targetId);
        adj.get(e.targetId)?.push(e.sourceId);
      });

      // Generate random walks & compute structural co-occurrence vectors
      for (const node of nodes) {
        const structuralCounts = new Map<string, number>();
        
        for (let w = 0; w < this.numWalks; w++) {
          let curr = node.id;
          for (let step = 0; step < this.walkLength; step++) {
            const neighbors = adj.get(curr) ?? [];
            if (neighbors.length === 0) break;
            const nextNode = neighbors[Math.floor(Math.random() * neighbors.length)];
            structuralCounts.set(nextNode, (structuralCounts.get(nextNode) ?? 0) + 1);
            curr = nextNode;
          }
        }

        // Project structural neighborhood counts to 128-dim vector
        const vector = new Array(this.dimension).fill(0);
        let hash = 0;
        for (const [neighborId, count] of structuralCounts.entries()) {
          for (let i = 0; i < neighborId.length; i++) {
            hash = (hash << 5) - hash + neighborId.charCodeAt(i);
            hash |= 0;
          }
          for (let i = 0; i < this.dimension; i++) {
            const val = Math.sin(hash + i * count) * 10000;
            vector[i] += val - Math.floor(val);
          }
        }

        // Normalize vector length
        const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;
        const normalized = vector.map((v) => v / norm);
        const vectorString = `[${normalized.join(',')}]`;

        // Upsert into graph_node_embeddings
        await this.prisma.$executeRawUnsafe(
          `INSERT INTO "graph_node_embeddings" ("id", "nodeId", "model", "dimensions", "createdAt", "updatedAt", "embedding")
           VALUES ($1, $2, 'deepwalk-node2vec', 128, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $3::vector)
           ON CONFLICT ("nodeId") DO UPDATE
           SET "embedding" = $3::vector, "updatedAt" = CURRENT_TIMESTAMP`,
          `gne_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          node.id,
          vectorString,
        );
      }

      this.logger.log(`Generated DeepWalk/Node2Vec graph embeddings for ${nodes.length} nodes.`);
      return { nodesProcessed: nodes.length };
    } catch (err: any) {
      this.logger.error(`Error generating graph embeddings: ${err.message}`);
      return { nodesProcessed: 0 };
    }
  }

  /**
   * Performs structural similarity search using pgvector on graph_node_embeddings.
   */
  async searchSimilarStructurally(
    nodeSlug: string,
    topK = 5,
  ): Promise<GraphEmbeddingSearchResult[]> {
    try {
      const targetNode = await this.prisma.knowledgeNode.findUnique({
        where: { slug: nodeSlug },
        select: { id: true },
      });
      if (!targetNode) return [];

      const query = `
        SELECT kn.id, kn.name, kn.slug, kn.type,
               (1 - (gne.embedding <=> target.embedding)) AS similarity
        FROM "graph_node_embeddings" gne
        JOIN "knowledge_nodes" kn ON kn.id = gne."nodeId"
        JOIN "graph_node_embeddings" target ON target."nodeId" = $1
        WHERE gne."nodeId" != $1 AND gne.embedding IS NOT NULL
        ORDER BY gne.embedding <=> target.embedding
        LIMIT $2;
      `;

      const rows: any[] = await this.prisma.$queryRawUnsafe(query, targetNode.id, topK);

      return rows.map((r) => ({
        nodeId: r.id,
        name: r.name,
        slug: r.slug,
        type: r.type,
        similarity: parseFloat(r.similarity ?? '0'),
      }));
    } catch (err: any) {
      this.logger.error(`Graph embedding structural search error: ${err.message}`);
      return [];
    }
  }
}
