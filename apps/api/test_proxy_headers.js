const http = require('http');

console.log('Testing Next.js same-origin proxy header forwarding...');

const options = {
  hostname: 'localhost',
  port: 3005,
  path: '/api/dashboard',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer test-bearer-token-12345',
    'Cookie': 'refresh_token=test-refresh-token-67890',
    'X-Request-ID': 'test-request-id-abcde'
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log('Response Status:', res.statusCode);
    console.log('Response Body:', data);
  });
});

req.on('error', (err) => {
  console.error('Request Error:', err.message);
});

req.end();
