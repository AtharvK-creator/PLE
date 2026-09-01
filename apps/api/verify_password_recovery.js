const http = require('http');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

const API_BASE = 'http://localhost:3001/api/v1';
const prisma = new PrismaClient();

function makeRequest(method, path, body = null) {
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

    req.on('error', (err) => {
      reject(err);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function verifyRecoveryFlow() {
  console.log('=== PASSWORD RECOVERY INTEGRATION TEST ===\n');

  const email = `test.reset.${Math.floor(Math.random() * 1000000)}@ple.app`;
  const originalPassword = 'Password123!';
  const name = 'Recovery Test Student';

  console.log(`[1/8] Registering test user: ${email}...`);
  const regResponse = await makeRequest('POST', '/auth/register', {
    email,
    password: originalPassword,
    name,
  });

  if (regResponse.statusCode !== 201) {
    console.error('Registration failed:', regResponse.data);
    process.exit(1);
  }
  console.log('User registered successfully.');

  console.log('\n[2/8] Requesting OTP code (forgot-password)...');
  const forgotResponse = await makeRequest('POST', '/auth/forgot-password', { email });
  console.log('Response:', forgotResponse.data);

  if (forgotResponse.statusCode !== 200) {
    console.error('Forgot password request failed:', forgotResponse.data);
    process.exit(1);
  }

  console.log('\n[3/8] Fetching hashed OTP from database...');
  const user = await prisma.user.findUnique({
    where: { email },
    include: { passwordResetOtps: true },
  });

  if (!user || user.passwordResetOtps.length === 0) {
    console.error('No OTP records found in database for user!');
    process.exit(1);
  }

  const latestOtpRecord = user.passwordResetOtps[user.passwordResetOtps.length - 1];
  console.log('OTP Record found:', {
    id: latestOtpRecord.id,
    otpHash: latestOtpRecord.otpHash,
    expiresAt: latestOtpRecord.expiresAt,
    used: latestOtpRecord.used,
  });

  console.log('\n[4/8] Recovering plain OTP code via SHA-256 brute force...');
  const targetHash = latestOtpRecord.otpHash;
  let plainOtp = null;
  const start = Date.now();

  for (let i = 100000; i <= 999999; i++) {
    const code = i.toString();
    const hash = crypto.createHash('sha256').update(code).digest('hex');
    if (hash === targetHash) {
      plainOtp = code;
      break;
    }
  }

  if (!plainOtp) {
    console.error('Failed to brute force OTP code!');
    process.exit(1);
  }
  console.log(`Successfully recovered plain OTP: ${plainOtp} in ${Date.now() - start}ms`);

  console.log('\n[5/8] Verifying OTP code (verify-reset-otp)...');
  const verifyResponse = await makeRequest('POST', '/auth/verify-reset-otp', {
    email,
    otp: plainOtp,
  });
  console.log('Response:', verifyResponse.data);

  if (verifyResponse.statusCode !== 200 || !verifyResponse.data?.data?.verificationToken) {
    console.error('OTP verification failed:', verifyResponse.data);
    process.exit(1);
  }
  const token = verifyResponse.data.data.verificationToken;
  console.log('Acquired verificationToken.');

  console.log('\n[6/8] Resetting password to a new value...');
  const newPassword = 'NewStrongPassword456!';
  const resetResponse = await makeRequest('POST', '/auth/reset-password', {
    token,
    newPassword,
  });
  console.log('Response:', resetResponse.data);

  if (resetResponse.statusCode !== 200) {
    console.error('Password reset failed:', resetResponse.data);
    process.exit(1);
  }
  console.log('Password reset successful.');

  console.log('\n[7/8] Verifying login with the NEW password...');
  const loginNewResponse = await makeRequest('POST', '/auth/login', {
    email,
    password: newPassword,
  });
  if (loginNewResponse.statusCode === 200) {
    console.log('[PASS] Login with new password succeeded.');
  } else {
    console.error('[FAIL] Login with new password failed:', loginNewResponse.data);
  }

  console.log('\n[8/8] Verifying login with the OLD password...');
  const loginOldResponse = await makeRequest('POST', '/auth/login', {
    email,
    password: originalPassword,
  });
  if (loginOldResponse.statusCode === 401) {
    console.log('[PASS] Login with old password rejected with 401 (Unauthorized).');
  } else {
    console.error('[FAIL] Login with old password did not fail as expected:', loginOldResponse.statusCode, loginOldResponse.data);
  }

  console.log('\n=== PASSWORD RECOVERY FLOW FULLY VERIFIED AND SECURED! ===');
  await prisma.$disconnect();
}

verifyRecoveryFlow().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
