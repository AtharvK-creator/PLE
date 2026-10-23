export interface QuizPromptInput {
  topic: string;
  subject: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  totalQuestions: number;
}

export function buildQuizPrompt(input: QuizPromptInput): string {
  const difficultyDescription = {
    EASY: 'fundamental concepts, definitions, and basic applications',
    MEDIUM: 'applied concepts, problem-solving, and intermediate implementations',
    HARD: 'advanced concepts, complex problem-solving, optimization, and edge cases',
  }[input.difficulty];

  return `Generate a ${input.difficulty.toLowerCase()} difficulty engineering quiz about "${input.topic}" in the subject "${input.subject}".

Difficulty focus: ${difficultyDescription}

Return ONLY a valid JSON array with EXACTLY ${input.totalQuestions} questions (no markdown, no code blocks, just JSON array):
[
  {
    "questionText": "The complete question text",
    "orderIndex": 1,
    "explanation": "Clear explanation of why the correct answer is right (1-2 sentences)",
    "options": [
      { "optionLabel": "A", "optionText": "First option text", "isCorrect": false },
      { "optionLabel": "B", "optionText": "Second option text", "isCorrect": true },
      { "optionLabel": "C", "optionText": "Third option text", "isCorrect": false },
      { "optionLabel": "D", "optionText": "Fourth option text", "isCorrect": false }
    ]
  }
]

Requirements:
- EXACTLY ${input.totalQuestions} questions
- EXACTLY 4 options per question (labeled A, B, C, D)
- EXACTLY 1 correct option per question (isCorrect: true)
- Questions must be specific to "${input.topic}" and engineering context
- No repeated questions or very similar questions
- Varied question types: definition, application, analysis, comparison
- All options must be plausible (no obviously wrong options)
- orderIndex starts at 1`;
}

export function buildQuizSystemPrompt(): string {
  return `You are an expert engineering professor creating high-quality multiple choice assessments. Always respond with valid JSON only. Never include markdown formatting.`;
}
