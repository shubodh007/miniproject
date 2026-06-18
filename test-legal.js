const http = require('http');

console.log('Sending request to legal analyze...');

const postData = JSON.stringify({
  documentText: 'This is a test lease agreement. Rent is 500 dollars. Everything is legal.',
  fileName: 'test-lease.pdf',
  email: 'test@example.com'
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/v1/legal/analyze',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  res.setEncoding('utf8');
  res.on('data', (chunk) => {
    console.log(`BODY: ${chunk}`);
  });
  res.on('end', () => {
    console.log('No more data in response.');
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.write(postData);
req.end();
