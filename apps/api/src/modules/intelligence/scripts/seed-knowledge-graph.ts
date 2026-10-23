import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { GraphService } from '../services/graph.service';

@Injectable()
export class KnowledgeGraphSeeder implements OnModuleInit {
  private readonly logger = new Logger(KnowledgeGraphSeeder.name);

  constructor(private readonly graphService: GraphService) {}

  onModuleInit() {
    this.seedGraph().catch((err) => {
      this.logger.warn(`Knowledge Graph seed background init warning: ${err.message}`);
    });
  }

  async seedGraph() {
    try {
      this.logger.log('Seeding initial Knowledge Graph nodes and edges...');

      // 1. Create Core Concept Nodes
      const nodes = [
        { slug: 'c-programming', name: 'C Programming', type: 'CONCEPT' as const, desc: 'Foundational procedural language' },
        { slug: 'pointers', name: 'Pointers & Memory Addresses', type: 'CONCEPT' as const, desc: 'Memory pointers, dereferencing, and address arithmetic' },
        { slug: 'dynamic-memory', name: 'Dynamic Memory Allocation', type: 'CONCEPT' as const, desc: 'Heap memory management with malloc, free, and memory leaks' },
        { slug: 'data-structures', name: 'Data Structures', type: 'CONCEPT' as const, desc: 'Core data organization structures' },
        { slug: 'linked-lists', name: 'Linked Lists', type: 'CONCEPT' as const, desc: 'Singly and doubly linked pointer structures' },
        { slug: 'trees-graphs', name: 'Trees & Graphs', type: 'CONCEPT' as const, desc: 'Non-linear hierarchical and graph structures' },
        { slug: 'algorithms', name: 'Algorithms & Complexity', type: 'CONCEPT' as const, desc: 'Big-O time and space complexity' },
        { slug: 'system-architecture', name: 'System Architecture', type: 'CONCEPT' as const, desc: 'Distributed systems and high availability design' },
        { slug: 'database-indexing', name: 'Database Indexing', type: 'CONCEPT' as const, desc: 'B-Trees, Hash, GIN, and HNSW indexes' },
      ];

      for (const node of nodes) {
        await this.graphService.upsertNode(node.slug, node.name, node.type, node.desc);
      }

      // 2. Connect Prerequisite Edges (source PREREQUISITE_FOR target)
      const edges = [
        { src: 'c-programming', tgt: 'pointers', rel: 'PREREQUISITE_FOR' as const },
        { src: 'pointers', tgt: 'dynamic-memory', rel: 'PREREQUISITE_FOR' as const },
        { src: 'pointers', tgt: 'linked-lists', rel: 'PREREQUISITE_FOR' as const },
        { src: 'linked-lists', tgt: 'data-structures', rel: 'PREREQUISITE_FOR' as const },
        { src: 'data-structures', tgt: 'trees-graphs', rel: 'PREREQUISITE_FOR' as const },
        { src: 'data-structures', tgt: 'algorithms', rel: 'PREREQUISITE_FOR' as const },
        { src: 'database-indexing', tgt: 'system-architecture', rel: 'PREREQUISITE_FOR' as const },
      ];

      for (const edge of edges) {
        await this.graphService.connectNodes(edge.src, edge.tgt, edge.rel);
      }

      this.logger.log('Knowledge Graph seed completed successfully.');
    } catch (err: any) {
      this.logger.warn(`Knowledge Graph seed deferred: ${err.message}`);
    }
  }
}
