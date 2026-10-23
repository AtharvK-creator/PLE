import { Injectable } from '@nestjs/common';
import { StudentContextPayload } from './student-context.service';

export interface RankedItem {
  id: string;
  sourceType: 'GRAPH' | 'VECTOR';
  title: string;
  content: string;
  score: number;
}

@Injectable()
export class ContextBuilderService {
  /**
   * Formats student context, graph prerequisites, and vector search results into a clean RAG prompt context string.
   */
  buildRAGPromptContext(
    studentContext: StudentContextPayload,
    rankedItems: RankedItem[],
    maxTokens = 1500,
  ): string {
    const sections: string[] = [];

    sections.push(`[STUDENT CONTEXT]
- Career Goal: ${studentContext.careerGoal} (Semester ${studentContext.semester}, ${studentContext.branch})
- EYT Thinking Level: ${studentContext.thinkingLevel} (Score: ${studentContext.thinkingScore})
- Mastered Skills: ${studentContext.masteredSkills.join(', ') || 'None reported'}
- Currently Learning: ${studentContext.learningSkills.join(', ') || 'General fundamentals'}
- Known Weak Concepts: ${studentContext.weakConcepts.join(', ') || 'None flagged'}
- Recent Struggled Questions: ${studentContext.struggledQuestions.join(' | ') || 'None'}`);

    if (rankedItems.length > 0) {
      sections.push(`[RETRIEVED KNOWLEDGE & CONTEXT (Graph + Vector)]`);
      rankedItems.slice(0, 5).forEach((item, idx) => {
        sections.push(`Reference #${idx + 1} (${item.sourceType} | Score: ${item.score.toFixed(2)}):
Title: ${item.title}
Content: ${item.content}`);
      });
    }

    let combined = sections.join('\n\n');
    if (combined.length > maxTokens * 4) {
      combined = combined.substring(0, maxTokens * 4) + '\n...[truncated]';
    }

    return combined;
  }
}
