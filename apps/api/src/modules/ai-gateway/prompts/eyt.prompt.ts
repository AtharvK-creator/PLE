export function buildEytSystemPrompt(): string {
  return `You are MIKE, an expert technical mentor, cognitive scientist, and technical recruiter.
Your goal is to evaluate the student's independent reasoning, problem-solving depth, originality, and reflection.

You must NEVER accuse the student of cheating or call this an 'AI Detector'. Instead, use the term 'Solution Similarity' or 'Reasoning Similarity'.
Provide constructive, encouraging, yet highly professional and rigorous feedback.
Your output must be a single, valid JSON object matching the requested schema exactly, with no extra text or markdown wrappers.`;
}

export interface EytPromptParams {
  challengeTitle: string;
  challengeCategory: string;
  challengeDifficulty: string;
  problemStatement: string;
  referenceSolution: string;
  submittedAnswer: string;
  reflectionWhy: string;
  reflectionAlternatives: string;
  reflectionAssumptions: string;
  reflectionFailures: string;
  reflectionImprovement: string;
  reflectionTradeoffs: string;
  confidenceLevel: string;
  thinkingTimeSeconds: number;
}

export function buildEytEvaluationPrompt(params: EytPromptParams): string {
  return `Please evaluate the following student challenge submission and reflection.

CHALLENGE DETAILS:
- Title: ${params.challengeTitle}
- Category: ${params.challengeCategory}
- Difficulty: ${params.challengeDifficulty}
- Problem Statement: ${params.problemStatement}
- Target Reference Solution: ${params.referenceSolution}

STUDENT SUBMISSION DETAILS:
- Solution Submitted: "${params.submittedAnswer}"
- Confidence Level Selected: ${params.confidenceLevel}
- Time Spent Thinking: ${params.thinkingTimeSeconds} seconds

STUDENT REFLECTIONS:
- Why did you choose this solution?
  "${params.reflectionWhy}"
- What alternative approaches exist?
  "${params.reflectionAlternatives}"
- What assumptions did you make?
  "${params.reflectionAssumptions}"
- Where could this solution fail?
  "${params.reflectionFailures}"
- How would you improve it?
  "${params.reflectionImprovement}"
- What trade-offs exist?
  "${params.reflectionTradeoffs}"

INSTRUCTIONS:
1. Conduct a rigorous server-side evaluation.
2. Score each dimension from 0 to 100:
   - Logical Reasoning (weight 25%): Strength of logic, step-by-step reasoning, and deductive coherence.
   - Originality (weight 20%): Unique framing, custom examples, independent thinking. (Higher score if they didn't copy-paste generic AI templates).
   - Problem Decomposition (weight 20%): How well they broke the problem down into sub-problems.
   - Technical Accuracy (weight 15%): Technical feasibility and correctness of details.
   - Creativity (weight 10%): Novel solutions, out-of-the-box approaches.
   - Reflection (weight 10%): Depth, self-awareness, and critical rigor in their reflection answers.
3. Compute the overall score:
   - Calculate the weighted average of the six dimensions.
   - Calculate 'similarityPercent' (0-100) representing how similar the student's solution structure and language is to standard AI-generated boilerplate or simple reference code.
   - If similarityPercent is high, DO NOT reduce the core scores if the reasoning is excellent. Instead, apply a minor similarity penalty (e.g. subtract up to 5 points from the final overall score, but keep it fair: a student who independently reaches the same solution should still receive an excellent score).
4. Identify 'hiddenAssumptions' they made, 'alternativePerspective' they missed, 'industryPerspective' (production-grade systems), and 'interviewPerspective' (pitching this in a job interview).
5. Generate a constructive response structure.

Return ONLY a JSON object matching this TypeScript interface (no markdown, no backticks, just raw JSON):
{
  "scoreLogicalReasoning": number,
  "scoreOriginality": number,
  "scoreDecomposition": number,
  "scoreAccuracy": number,
  "scoreCreativity": number,
  "scoreReflection": number,
  "scoreOverall": number,
  "similarityPercent": number,
  "reasoningDifference": "brief analysis of their unique logic path vs reference",
  "feedbackOriginality": "analysis of their unique ideas/examples",
  "feedbackStrengths": "1-2 sentences highlighting cognitive strengths",
  "feedbackWeaknesses": "1-2 sentences of constructive critique where logic/depth was lacking",
  "hiddenAssumptions": "assumptions made and why they matter",
  "alternativePerspective": "an alternative perspective or conceptual angle to consider",
  "industryPerspective": "how this is solved in professional production environments",
  "interviewPerspective": "how to pitch or defend this solution in a technical job interview",
  "referenceSolution": "a complete model solution",
  "alternativeSolutions": ["alternative approach 1", "alternative approach 2"],
  "learningResources": [
    { "title": "resource title", "url": "brief description or recommendation link" }
  ]
}`;
}
