import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { EmbeddingService } from './embedding.service';

export interface VectorSearchResult {
  id: string;
  userId: string | null;
  type: string;
  referenceId: string;
  content: string;
  metadata: any;
  similarity: number;
}

@Injectable()
export class VectorSearchService {
  private readonly logger = new Logger(VectorSearchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddingService: EmbeddingService,
  ) {}

  /**
   * Embeds text content and stores it in vector_documents with HNSW vector index.
   */
  async indexDocument(
    type: string,
    referenceId: string,
    content: string,
    userId?: string,
    metadata: Record<string, any> = {},
  ): Promise<string> {
    const embedding = await this.embeddingService.generateEmbedding(content);
    const vectorString = `[${embedding.join(',')}]`;

    const existing = await this.prisma.vectorDocument.findFirst({
      where: { type: type as any, referenceId },
    });

    if (existing) {
      await this.prisma.$executeRawUnsafe(
        `UPDATE "vector_documents"
         SET "content" = $1, "metadata" = $2::jsonb, "embedding" = $3::vector
         WHERE "id" = $4`,
        content,
        JSON.stringify(metadata),
        vectorString,
        existing.id,
      );
      return existing.id;
    }

    const newId = `vec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO "vector_documents" ("id", "userId", "type", "referenceId", "content", "metadata", "createdAt", "embedding")
       VALUES ($1, $2, $3::"VectorDocumentType", $4, $5, $6::jsonb, CURRENT_TIMESTAMP, $7::vector)`,
      newId,
      userId ?? null,
      type,
      referenceId,
      content,
      JSON.stringify(metadata),
      vectorString,
    );

    return newId;
  }

  /**
   * Queries vector_documents using pgvector cosine distance (1 - cosine_distance).
   */
  async searchSimilar(
    queryText: string,
    topK = 5,
    filterType?: string,
    userId?: string,
  ): Promise<VectorSearchResult[]> {
    try {
      const embedding = await this.embeddingService.generateEmbedding(queryText);
      const vectorString = `[${embedding.join(',')}]`;

      let query = `
        SELECT "id", "userId", "type", "referenceId", "content", "metadata",
               (1 - ("embedding" <=> $1::vector)) AS similarity
        FROM "vector_documents"
        WHERE "embedding" IS NOT NULL
      `;
      const params: any[] = [vectorString];

      if (filterType) {
        params.push(filterType);
        query += ` AND "type" = $${params.length}::"VectorDocumentType"`;
      }

      if (userId) {
        params.push(userId);
        query += ` AND ("userId" = $${params.length} OR "userId" IS NULL)`;
      }

      query += ` ORDER BY "embedding" <=> $1::vector LIMIT $${params.length + 1}`;
      params.push(topK);

      const rows: any[] = await this.prisma.$queryRawUnsafe(query, ...params);

      return rows.map((r) => ({
        id: r.id,
        userId: r.userId,
        type: r.type,
        referenceId: r.referenceId,
        content: r.content,
        metadata: r.metadata ?? {},
        similarity: parseFloat(r.similarity ?? '0'),
      }));
    } catch (err: any) {
      this.logger.error(`Vector search error: ${err.message}`);
      return [];
    }
  }
}
