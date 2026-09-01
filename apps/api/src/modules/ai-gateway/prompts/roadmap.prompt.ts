export interface RoadmapPromptInput {
  goal: string;
  branch: string;
  semester: number;
  currentSkillLevel?: string;
}

export function buildRoadmapPrompt(input: RoadmapPromptInput): string {
  return `You are an expert engineering curriculum designer and career coach.

Generate a personalized 6-month learning roadmap for an engineering student with the following profile:
- Branch: ${input.branch}
- Current Semester: ${input.semester}
- Career Goal: ${input.goal}
- Skill Level: ${input.currentSkillLevel ?? 'BEGINNER'}

Return ONLY a valid JSON object with this EXACT structure (no markdown, no code blocks, just JSON):
{
  "title": "[Descriptive roadmap title]",
  "overview": "[2-3 sentence overview of the roadmap]",
  "steps": [
    {
      "title": "Step title",
      "description": "Detailed description of what to learn and how (2-4 sentences)",
      "weekNumber": 1,
      "monthNumber": 1,
      "orderIndex": 1,
      "skills": ["Skill 1", "Skill 2", "Skill 3"]
    }
  ]
}

Requirements:
- Generate exactly 12-16 steps spanning 6 months (24 weeks)
- Each month should have 2-3 steps with clear progression
- Steps must build on each other logically
- Include specific, actionable skill names (not generic terms)
- Tailor to the student's branch and career goal
- Include both technical and foundational skills
- Week numbers: 1-24, Month numbers: 1-6
- Order steps logically (orderIndex starting from 1)
- Skills array should have 3-5 specific skills per step`;
}

export function buildRoadmapSystemPrompt(): string {
  return `You are an expert engineering education specialist with deep knowledge of technology careers. You create precise, actionable learning roadmaps. Always respond with valid JSON only.`;
}
