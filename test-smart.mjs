import http from 'http';

const postData = JSON.stringify({
  messages: [{ role: 'user', content: 'hello' }],
  thinkingLevel: 'low'
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/smart-chat/generate',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  let chunks = '';
  res.on('data', (chunk) => chunks += chunk);
  res.on('end', () => console.log(`BODY: ${chunks}`));
});

req.on('error', (e) => console.error(e));
req.write(postData);
req.end();
