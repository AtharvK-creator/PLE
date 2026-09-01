import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { EmbeddingService } from './services/embedding.service';
import { VectorSearchService } from './services/vector-search.service';
import { GraphService } from './services/graph.service';
import { StudentContextService } from './services/student-context.service';
import { ContextBuilderService } from './services/context-builder.service';
import { HybridRetrievalService } from './services/hybrid-retrieval.service';
import { GraphEmbeddingService } from './services/graph-embedding.service';
import { KnowledgeGraphSeeder } from './scripts/seed-knowledge-graph';

@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [
    EmbeddingService,
    VectorSearchService,
    GraphService,
    GraphEmbeddingService,
    StudentContextService,
    ContextBuilderService,
    HybridRetrievalService,
    KnowledgeGraphSeeder,
  ],
  exports: [
    EmbeddingService,
    VectorSearchService,
    GraphService,
    GraphEmbeddingService,
    StudentContextService,
    ContextBuilderService,
    HybridRetrievalService,
  ],
})
export class IntelligenceModule {}
