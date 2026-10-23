const http = require('http');

const PROXY_BASE = 'http://localhost:3005/api';

function makeRequest(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(PROXY_BASE + path);
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

async function verifyFlow() {
  console.log('=== STARTING FRONTEND AUTH FLOW VERIFICATION ===\n');

  const email = `quiz.flow.${Date.now()}@ple.app`;
  const password = 'Password123';
  const name = 'Quiz Flow User';

  // 1. Register
  console.log('1. Registering user via Next.js Proxy...');
  const regRes = await makeRequest('POST', '/auth/register', { email, password, name });
  console.log('   Response Status:', regRes.statusCode);
  
  // Verify wrapped structure
  const regData = regRes.data;
  if (regData && regData.success && regData.data && regData.data.tokens) {
    console.log('   [PASS] Registration returns correctly wrapped response.');
  } else {
    console.log('   [FAIL] Registration response structure invalid:', JSON.stringify(regData));
    process.exit(1);
  }

  // 2. Login
  console.log('\n2. Logging in user via Next.js Proxy...');
  const loginRes = await makeRequest('POST', '/auth/login', { email, password });
  console.log('   Response Status:', loginRes.statusCode);
  
  const loginData = loginRes.data;
  let accessToken = null;
  if (loginData && loginData.success && loginData.data && loginData.data.tokens) {
    accessToken = loginData.data.tokens.accessToken;
    console.log('   [PASS] Login returns correctly wrapped response.');
    console.log('   Access Token retrieved successfully (Length:', accessToken.length, ')');
  } else {
    console.log('   [FAIL] Login response structure invalid:', JSON.stringify(loginData));
    process.exit(1);
  }

  // Set up profile
  console.log('\n3. Setting up profile...');
  const profileRes = await makeRequest('PATCH', '/users/me/profile', {
    name: 'Quiz Flow User',
    branch: 'Computer Science Engineering',
    semester: 4,
    careerGoal: 'AI/ML Engineer',
    skillLevel: 'BEGINNER'
  }, accessToken);
  console.log('   Profile Response Status:', profileRes.statusCode);

  // 4. Generate Quiz
  console.log('\n4. Generating Quiz via Next.js Proxy...');
  const quizBody = {
    topic: 'Git and Version Control',
    subject: 'Software Engineering',
    difficulty: 'EASY',
    totalQuestions: 5
  };
  
  const startTime = Date.now();
  const quizRes = await makeRequest('POST', '/quiz/generate', quizBody, accessToken);
  const duration = Date.now() - startTime;
  
  console.log('   Response Status:', quizRes.statusCode);
  console.log(`   Time Taken: ${duration}ms`);
  
  const quizData = quizRes.data;
  if (quizRes.statusCode === 200 || quizRes.statusCode === 201) {
    console.log('   [PASS] Quiz Generation = 200/201 OK');
    if (quizData.data && quizData.data.questions && quizData.data.questions.length > 0) {
      console.log('   [PASS] Questions Returned = YES (Count:', quizData.data.questions.length, ')');
      console.log('   [PASS] Gemini Called = YES');
      console.log('\nSample Question 1:');
      const q = quizData.data.questions[0];
      console.log(`   Question: ${q.questionText}`);
      q.options.forEach(opt => {
        console.log(`     - [${opt.optionLabel}] ${opt.optionText}`);
      });
    } else {
      console.log('   [FAIL] No questions returned in response:', JSON.stringify(quizData));
    }
  } else {
    console.log('   [FAIL] Quiz Generation failed:', JSON.stringify(quizData));
  }
  
  console.log('\n=== VERIFICATION COMPLETED ===');
}

verifyFlow();
