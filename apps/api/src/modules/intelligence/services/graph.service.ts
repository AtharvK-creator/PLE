import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

export interface GraphNodeResult {
  id: string;
  name: string;
  slug: string;
  type: string;
  description: string | null;
  difficulty: string | null;
  depth?: number;
}

export interface GraphEdgeResult {
  sourceId: string;
  targetId: string;
  relationship: string;
  weight: number;
  provenance: string;
}

@Injectable()
export class GraphService {
  private readonly logger = new Logger(GraphService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates or updates a Knowledge Node.
   */
  async upsertNode(
    slug: string,
    name: string,
    type: 'CONCEPT' | 'SKILL' | 'CHALLENGE' | 'QUESTION' | 'ROADMAP_STEP',
    description?: string,
    difficulty = 'INTERMEDIATE',
    metadata: Record<string, any> = {},
  ) {
    return this.prisma.knowledgeNode.upsert({
      where: { slug },
      update: { name, type, description, difficulty, metadata },
      create: { slug, name, type, description, difficulty, metadata },
    });
  }

  /**
   * Connects two Knowledge Nodes with a directed edge relationship.
   */
  async connectNodes(
    sourceSlug: string,
    targetSlug: string,
    relationship: 'PREREQUISITE_FOR' | 'TEACHES' | 'TESTED_BY' | 'RELATED_TO' | 'PART_OF' | 'REQUIRES',
    weight = 1.0,
    provenance = 'EXPLICIT',
  ) {
    const source = await this.prisma.knowledgeNode.findUnique({ where: { slug: sourceSlug } });
    const target = await this.prisma.knowledgeNode.findUnique({ where: { slug: targetSlug } });

    if (!source || !target) {
      this.logger.warn(`Cannot connect missing nodes: ${sourceSlug} -> ${targetSlug}`);
      return null;
    }

    return this.prisma.knowledgeEdge.upsert({
      where: {
        sourceId_targetId_relationship: {
          sourceId: source.id,
          targetId: target.id,
          relationship,
        },
      },
      update: { weight, provenance },
      create: {
        sourceId: source.id,
        targetId: target.id,
        relationship,
        weight,
        provenance,
      },
    });
  }

  /**
   * Executes Recursive CTE to traverse prerequisite DAG up to maxDepth.
   */
  async getPrerequisites(nodeSlug: string, maxDepth = 3): Promise<GraphNodeResult[]> {
    try {
      const startNode = await this.prisma.knowledgeNode.findUnique({ where: { slug: nodeSlug } });
      if (!startNode) return [];

      const query = `
        WITH RECURSIVE prereq_tree AS (
          SELECT n.id, n.name, n.slug, n.type, n.description, n.difficulty, 1 AS depth
          FROM "knowledge_nodes" n
          JOIN "knowledge_edges" e ON n.id = e."sourceId"
          WHERE e."targetId" = $1 AND e.relationship = 'PREREQUISITE_FOR'

          UNION

          SELECT parent.id, parent.name, parent.slug, parent.type, parent.description, parent.difficulty, pt.depth + 1
          FROM "knowledge_nodes" parent
          JOIN "knowledge_edges" e ON parent.id = e."sourceId"
          JOIN prereq_tree pt ON e."targetId" = pt.id
          WHERE e.relationship = 'PREREQUISITE_FOR' AND pt.depth < $2
        )
        SELECT DISTINCT id, name, slug, type, description, difficulty, depth
        FROM prereq_tree
        ORDER BY depth ASC;
      `;

      const rows: any[] = await this.prisma.$queryRawUnsafe(query, startNode.id, maxDepth);

      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        type: r.type,
        description: r.description,
        difficulty: r.difficulty,
        depth: Number(r.depth),
      }));
    } catch (err: any) {
      this.logger.error(`Graph prerequisite CTE query error: ${err.message}`);
      return [];
    }
  }

  /**
   * Finds related concepts via direct edges or 2-hop graph traversal.
   */
  async getRelatedNodes(nodeSlug: string, limit = 5): Promise<GraphNodeResult[]> {
    try {
      const startNode = await this.prisma.knowledgeNode.findUnique({ where: { slug: nodeSlug } });
      if (!startNode) return [];

      const query = `
        SELECT DISTINCT n.id, n.name, n.slug, n.type, n.description, n.difficulty, 1 as depth
        FROM "knowledge_nodes" n
        JOIN "knowledge_edges" e ON (
          (e."sourceId" = $1 AND e."targetId" = n.id) OR
          (e."targetId" = $1 AND e."sourceId" = n.id)
        )
        WHERE n.id != $1
        LIMIT $2;
      `;

      const rows: any[] = await this.prisma.$queryRawUnsafe(query, startNode.id, limit);

      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        type: r.type,
        description: r.description,
        difficulty: r.difficulty,
        depth: 1,
      }));
    } catch (err: any) {
      this.logger.error(`Graph related nodes query error: ${err.message}`);
      return [];
    }
  }
}
