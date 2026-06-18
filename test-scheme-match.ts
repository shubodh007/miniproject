import http from 'http';

const postData = JSON.stringify({
  name: "Jane",
  age: 45,
  gender: "Female",
  income_annual: 40000,
  occupation: "Farmer",
  bpl_card: "Yes",
  caste_category: "SC",
  district: "Anantapur",
  state: "Andhra Pradesh",
  language: "en"
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/v1/match',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  let chunks = '';
  res.on('data', (chunk) => chunks += chunk);
  res.on('end', () => console.log(`STATUS: ${res.statusCode}\nBODY: ${chunks}`));
});
req.setTimeout(80000, () => {
  console.log('Request timed out');
  req.destroy();
});

req.on('error', (e) => console.error(e));
req.write(postData);
req.end();
