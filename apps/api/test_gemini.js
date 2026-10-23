const { GoogleGenerativeAI } = require('@google/generative-ai');
// Load environment variables via Node.js native --env-file option

const apiKey = process.env.GEMINI_API_KEY;
console.log('1. Loaded API Key:', apiKey ? 'Loaded (Present: true)' : 'Not Loaded');

if (!apiKey) {
  console.error('Error: GEMINI_API_KEY is not set in environment.');
  process.exit(1);
}

const ai = new GoogleGenerativeAI(apiKey);

async function testTutor() {
  console.log('\n--- Testing Tutor Endpoint ---');
  try {
    const model = ai.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: { role: 'system', parts: [{ text: 'You are a helpful AI tutor.' }] }
    });
    console.log('Sending prompt: "Hello, what is 2+2?"');
    console.log('Model object initialized. Sending request content...');
    const startTime = Date.now();
    const result = await model.generateContent('Hello, what is 2+2?');
    const response = await result.response;
    const text = response.text();
    console.log('Response status: SUCCESS');
    console.log(`Latency: ${Date.now() - startTime}ms`);
    console.log('Raw text:', text);
  } catch (error) {
    console.error('Response status: FAIL');
    console.error('Error details:', error);
  }
}

async function testQuiz() {
  console.log('\n--- Testing Quiz Endpoint ---');
  try {
    const model = ai.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { responseMimeType: 'application/json' },
      systemInstruction: { role: 'system', parts: [{ text: 'You generate quizzes in JSON format. Return an array of objects containing questionText, orderIndex, options (array of optionText, optionLabel, isCorrect).' }] }
    });
    console.log('Sending prompt for a 1-question quiz on HTML...');
    console.log('Model object initialized. Sending request content...');
    const startTime = Date.now();
    const result = await model.generateContent('Generate a 1-question quiz on HTML.');
    const response = await result.response;
    const text = response.text();
    console.log('Response status: SUCCESS');
    console.log(`Latency: ${Date.now() - startTime}ms`);
    console.log('Raw text:', text);
    try {
      const parsed = JSON.parse(text);
      console.log('Parsing successful: PASS');
      console.log('Parsed JSON object:', JSON.stringify(parsed, null, 2));
    } catch (parseError) {
      console.error('Parsing successful: FAIL');
      console.error('Parse error:', parseError);
    }
  } catch (error) {
    console.error('Response status: FAIL');
    console.error('Error details:', error);
  }
}

async function testRoadmap() {
  console.log('\n--- Testing Roadmap Endpoint ---');
  try {
    // Note: Roadmap expects JSON return or plain text. Let's see if systemInstruction works.
    const model = ai.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: { role: 'system', parts: [{ text: 'You generate study roadmaps. Output format should be JSON.' }] }
    });
    console.log('Sending prompt for a React roadmap...');
    const startTime = Date.now();
    const result = await model.generateContent('Generate a short roadmap for React.');
    const response = await result.response;
    const text = response.text();
    console.log('Response status: SUCCESS');
    console.log(`Latency: ${Date.now() - startTime}ms`);
    console.log('Raw text:', text);
  } catch (error) {
    console.error('Response status: FAIL');
    console.error('Error details:', error);
  }
}

async function run() {
  await testTutor();
  await testQuiz();
  await testRoadmap();
}

run();
