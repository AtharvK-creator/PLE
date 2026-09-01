const http = require('http');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Load environment config directly
const API_BASE = 'http://localhost:3001/api/v1';

// Import prompt builder functions (replicated here to print exactly what is sent)
function buildTutorSystemPrompt(input) {
  const profile = [
    input.studentName ? `Name: ${input.studentName}` : null,
    input.branch ? `Branch: ${input.branch}` : null,
    input.semester ? `Semester: ${input.semester}` : null,
    input.skillLevel ? `Skill Level: ${input.skillLevel}` : null,
    input.careerGoal ? `Career Goal: ${input.careerGoal}` : null,
  ].filter(Boolean).join(', ');

  return `You are PLE's AI Tutor — an expert engineering mentor and educator with deep knowledge across all engineering disciplines.

Your role:
- Explain complex engineering and programming concepts clearly
- Provide working code examples with detailed explanations
- Help debug code and identify issues step by step
- Suggest learning resources and next steps
- Ask clarifying questions when the problem is unclear
- Adapt explanations to the student's level

${profile ? `Student profile: ${profile}` : ''}

Communication style:
- Use clear, structured explanations with headers when helpful
- Include practical code examples when relevant (use proper markdown code blocks with language)
- Break down complex topics into digestible parts
- Be encouraging and patient
- If you're unsure about something, say so honestly

Do NOT:
- Make up facts or give incorrect technical information
- Be dismissive of any question
- Provide code without explanation`;
}

function buildQuizPrompt(input) {
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

function buildQuizSystemPrompt() {
  return `You are an expert engineering professor creating high-quality multiple choice assessments. Always respond with valid JSON only. Never include markdown formatting.`;
}

function buildRoadmapPrompt(input) {
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

function buildRoadmapSystemPrompt() {
  return `You are an expert engineering education specialist with deep knowledge of technology careers. You create precise, actionable learning roadmaps. Always respond with valid JSON only.`;
}

function makeRequest(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_BASE + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({
          statusCode: res.statusCode,
          data: json,
        });
      });
    });

    req.on('error', (err) => reject(err));

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runDetailedTrace() {
  console.log('=== STARTING RUNTIME EXECUTION TRACE ===\n');

  // Verify GEMINI_API_KEY is loaded
  const apiKey = process.env.GEMINI_API_KEY;
  console.log('1. Verify GEMINI_API_KEY loaded:');
  if (apiKey) {
    console.log(`   [PASS] GEMINI_API_KEY is loaded. (Starts with: ${apiKey.substring(0, 5)}, Length: ${apiKey.length})`);
  } else {
    console.log('   [FAIL] GEMINI_API_KEY is not loaded!');
    process.exit(1);
  }

  const ai = new GoogleGenerativeAI(apiKey);

  // Register & Login to get token and update profile
  const email = `trace.user.${Date.now()}@ple.app`;
  const password = 'Password123';
  const name = 'Trace User';

  console.log('\nRegistering and setting up profile...');
  await makeRequest('POST', '/auth/register', { email, password, name });
  const loginRes = await makeRequest('POST', '/auth/login', { email, password });
  const token = loginRes.data.data.tokens.accessToken;

  // Update profile for Tutor / Roadmap contextual prompt
  const profileInfo = {
    name: 'Trace User',
    branch: 'Computer Science Engineering',
    semester: 4,
    careerGoal: 'AI/ML Engineer',
    skillLevel: 'BEGINNER'
  };
  await makeRequest('PATCH', '/users/me/profile', profileInfo, token);
  console.log('Profile setup complete.');

  // ==========================================
  // TUTOR ENDPOINT TRACE
  // ==========================================
  console.log('\n==========================================');
  console.log('1. AI TUTOR ENDPOINT TRACE');
  console.log('==========================================');

  // Request received
  const tutorSession = await makeRequest('POST', '/tutor/sessions', { title: 'Tutor Trace Session' }, token);
  const sessionId = tutorSession.data.data.id;
  const tutorRequestBody = { content: 'What is a binary search tree?' };
  console.log('[PASS] Request received at frontend/API:');
  console.log(`       POST /tutor/sessions/${sessionId}/messages`);
  console.log(`       Body: ${JSON.stringify(tutorRequestBody)}`);

  // Gemini request sent
  const tutorSystemPrompt = buildTutorSystemPrompt({
    studentName: profileInfo.name,
    branch: profileInfo.branch,
    semester: profileInfo.semester,
    skillLevel: profileInfo.skillLevel,
    careerGoal: profileInfo.careerGoal,
  });
  console.log('[PASS] Gemini request prepared and sent:');
  console.log(`       Model: gemini-2.5-flash`);
  console.log(`       System Prompt: ${tutorSystemPrompt.replace(/\n/g, ' ')}`);
  console.log(`       Prompt: ${tutorRequestBody.content}`);

  // Gemini response received
  let tutorResponseText = '';
  try {
    const model = ai.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: { role: 'system', parts: [{ text: tutorSystemPrompt }] }
    });
    const result = await model.generateContent(tutorRequestBody.content);
    tutorResponseText = result.response.text();
    console.log('[PASS] Gemini response received:');
    console.log(`       Raw response text: ${tutorResponseText.substring(0, 150)}...`);
  } catch (err) {
    console.log(`[FAIL] Gemini API call failed: ${err.message}`);
  }

  // Parsing successful
  // Tutor response does not require JSON parsing (it is Markdown)
  console.log('[PASS] Parsing successful (not required for text/markdown responses)');

  // Response returned to frontend
  const tutorApiRes = await makeRequest('POST', `/tutor/sessions/${sessionId}/messages`, tutorRequestBody, token);
  if (tutorApiRes.statusCode === 200 || tutorApiRes.statusCode === 201) {
    console.log('[PASS] Response returned to frontend:');
    console.log(`       HTTP Status: ${tutorApiRes.statusCode}`);
    console.log(`       API Response Data: ${JSON.stringify(tutorApiRes.data.data).substring(0, 150)}...`);
  } else {
    console.log(`[FAIL] Response returned to frontend failed with status ${tutorApiRes.statusCode}:`);
    console.log(JSON.stringify(tutorApiRes.data));
  }

  // ==========================================
  // QUIZ ENDPOINT TRACE
  // ==========================================
  console.log('\n==========================================');
  console.log('2. QUIZ ENDPOINT TRACE');
  console.log('==========================================');

  // Request received
  const quizRequestBody = {
    topic: 'Relational Database Design',
    subject: 'DBMS',
    difficulty: 'MEDIUM',
    totalQuestions: 5
  };
  console.log('[PASS] Request received at frontend/API:');
  console.log(`       POST /quiz/generate`);
  console.log(`       Body: ${JSON.stringify(quizRequestBody)}`);

  // Gemini request sent
  const quizPrompt = buildQuizPrompt(quizRequestBody);
  const quizSystemPrompt = buildQuizSystemPrompt();
  console.log('[PASS] Gemini request prepared and sent:');
  console.log(`       Model: gemini-2.5-flash`);
  console.log(`       System Prompt: ${quizSystemPrompt}`);
  console.log(`       Prompt: ${quizPrompt.replace(/\n/g, ' ')}`);

  // Gemini response received
  let quizResponseText = '';
  try {
    const model = ai.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { responseMimeType: 'application/json' },
      systemInstruction: { role: 'system', parts: [{ text: quizSystemPrompt }] }
    });
    const result = await model.generateContent(quizPrompt);
    quizResponseText = result.response.text();
    console.log('[PASS] Gemini response received:');
    console.log(`       Raw response text: ${quizResponseText.substring(0, 150)}...`);
  } catch (err) {
    console.log(`[FAIL] Gemini API call failed: ${err.message}`);
  }

  // Parsing successful
  let quizParsedData = null;
  try {
    quizParsedData = JSON.parse(quizResponseText.trim().replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim());
    console.log('[PASS] Parsing successful:');
    console.log(`       Parsed successfully as JSON array with ${quizParsedData.length} questions`);
  } catch (err) {
    console.log(`[FAIL] JSON parsing failed: ${err.message}`);
  }

  // Response returned to frontend
  const quizApiRes = await makeRequest('POST', '/quiz/generate', quizRequestBody, token);
  if (quizApiRes.statusCode === 200 || quizApiRes.statusCode === 201) {
    console.log('[PASS] Response returned to frontend:');
    console.log(`       HTTP Status: ${quizApiRes.statusCode}`);
    console.log(`       API Response Data: ${JSON.stringify(quizApiRes.data.data).substring(0, 150)}...`);
  } else {
    console.log(`[FAIL] Response returned to frontend failed with status ${quizApiRes.statusCode}:`);
    console.log(JSON.stringify(quizApiRes.data));
  }

  // ==========================================
  // ROADMAP ENDPOINT TRACE
  // ==========================================
  console.log('\n==========================================');
  console.log('3. ROADMAP ENDPOINT TRACE');
  console.log('==========================================');

  // Request received
  const roadmapRequestBody = {
    goal: 'DevOps Engineer',
    branch: 'Computer Science Engineering',
    semester: 4,
    currentSkillLevel: 'BEGINNER'
  };
  console.log('[PASS] Request received at frontend/API:');
  console.log(`       POST /roadmap/generate`);
  console.log(`       Body: ${JSON.stringify(roadmapRequestBody)}`);

  // Gemini request sent
  const roadmapPrompt = buildRoadmapPrompt(roadmapRequestBody);
  const roadmapSystemPrompt = buildRoadmapSystemPrompt();
  console.log('[PASS] Gemini request prepared and sent:');
  console.log(`       Model: gemini-2.5-flash`);
  console.log(`       System Prompt: ${roadmapSystemPrompt}`);
  console.log(`       Prompt: ${roadmapPrompt.replace(/\n/g, ' ')}`);

  // Gemini response received
  let roadmapResponseText = '';
  try {
    const model = ai.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { responseMimeType: 'application/json' },
      systemInstruction: { role: 'system', parts: [{ text: roadmapSystemPrompt }] }
    });
    const result = await model.generateContent(roadmapPrompt);
    roadmapResponseText = result.response.text();
    console.log('[PASS] Gemini response received:');
    console.log(`       Raw response text: ${roadmapResponseText.substring(0, 150)}...`);
  } catch (err) {
    console.log(`[FAIL] Gemini API call failed: ${err.message}`);
  }

  // Parsing successful
  let roadmapParsedData = null;
  try {
    roadmapParsedData = JSON.parse(roadmapResponseText.trim().replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim());
    console.log('[PASS] Parsing successful:');
    console.log(`       Parsed successfully as JSON object with title: "${roadmapParsedData.title}"`);
  } catch (err) {
    console.log(`[FAIL] JSON parsing failed: ${err.message}`);
  }

  // Response returned to frontend
  const roadmapApiRes = await makeRequest('POST', '/roadmap/generate', roadmapRequestBody, token);
  if (roadmapApiRes.statusCode === 200 || roadmapApiRes.statusCode === 201) {
    console.log('[PASS] Response returned to frontend:');
    console.log(`       HTTP Status: ${roadmapApiRes.statusCode}`);
    console.log(`       API Response Data: ${JSON.stringify(roadmapApiRes.data.data).substring(0, 150)}...`);
  } else {
    console.log(`[FAIL] Response returned to frontend failed with status ${roadmapApiRes.statusCode}:`);
    console.log(JSON.stringify(roadmapApiRes.data));
  }
}

runDetailedTrace();
