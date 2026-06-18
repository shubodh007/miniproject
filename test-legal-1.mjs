import http from 'http';

const postData = JSON.stringify({
  documentText: 'Tenant agrees to pay 100% of major structural repair costs.',
  fileName: 'test.pdf',
  email: 'test@example.com'
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/legal/analyze',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  let chunks = '';
  res.on('data', (chunk) => chunks += chunk);
  res.on('end', () => console.log(`BODY: ${chunks}`));
});

req.on('error', (e) => console.error(e));
req.write(postData);
req.end();
