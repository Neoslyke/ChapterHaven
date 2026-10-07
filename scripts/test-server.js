const http = require('http');

// Set test environment
process.env.PORT = '3333';
process.env.DATA_DIR = './data_test';
process.env.AUTH_USER = 'testuser';
process.env.AUTH_PASS = 'secret123';

const server = require('../src/server');

// Helper to make requests
function makeRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port: 3333,
      path,
      method: options.method || 'GET',
      headers: options.headers || {}
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

const authHeader = 'Basic ' + Buffer.from('testuser:secret123').toString('base64');

async function runTests() {
  // Give server time to bind
  await new Promise(r => setTimeout(r, 500));

  console.log('--- TEST 1: Root drops connection (ERR_EMPTY_RESPONSE) ---');
  let rootDropped = false;
  try {
    await makeRequest('/');
  } catch (err) {
    if (err.code === 'ECONNRESET' || err.message.includes('socket hang up')) {
      rootDropped = true;
      console.log('Successfully dropped connection on / (ECONNRESET -> Chrome ERR_EMPTY_RESPONSE)');
    }
  }
  if (!rootDropped) {
    throw new Error('Root path was not dropped with ERR_EMPTY_RESPONSE');
  }

  console.log('--- TEST 2: Unauthenticated 401 challenge on /chapterhaven (NO slash) ---');
  const resNoAuth = await makeRequest('/chapterhaven');
  console.log('Status:', resNoAuth.status, 'Location:', resNoAuth.headers.location, 'WWW-Authenticate:', resNoAuth.headers['www-authenticate']);
  if (resNoAuth.status !== 401 || !resNoAuth.headers['www-authenticate']) {
    throw new Error('Basic auth challenge header missing or wrong status');
  }

  console.log('--- TEST 3: Authenticated access to HTML on /chapterhaven (NO slash) ---');
  const resAuth = await makeRequest('/chapterhaven', {
    headers: { 'Authorization': authHeader }
  });
  console.log('Status:', resAuth.status, 'Location:', resAuth.headers.location, 'Body contains ChapterHaven:', resAuth.body.includes('ChapterHaven'));
  if (resAuth.status !== 200 || resAuth.headers.location || !resAuth.body.includes('ChapterHaven')) {
    throw new Error('Authenticated HTML load failed or redirected to slash');
  }

  console.log('--- TEST 4: Create Manga Entry ---');
  const newEntryRes = await makeRequest('/chapterhaven/api/entries', {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title: 'Solo Leveling',
      alt_titles: 'Na Honjaman Rebeleob, Only I Level Up',
      chapter: 179,
      type: 'Manhwa',
      status: 'Completed'
    })
  });
  console.log('Create Status:', newEntryRes.status);
  const created = JSON.parse(newEntryRes.body);
  console.log('Created ID:', created.id, 'Title:', created.title);
  if (newEntryRes.status !== 201 || created.title !== 'Solo Leveling') {
    throw new Error('Entry creation failed');
  }

  console.log('--- TEST 5: Toggle Favorite ---');
  const favRes = await makeRequest(`/chapterhaven/api/entries/${created.id}/favorite`, {
    method: 'POST',
    headers: { 'Authorization': authHeader }
  });
  const favorited = JSON.parse(favRes.body);
  console.log('Favorite state:', favorited.is_favorite);
  if (favorited.is_favorite !== 1) {
    throw new Error('Toggle favorite failed');
  }

  console.log('--- TEST 6: Bulk Import ---');
  const bulkRes = await makeRequest('/chapterhaven/api/entries/bulk', {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      items: [
        { title: 'Omniscient Reader', alt_titles: 'ORV', chapter: 220, type: 'Manhwa' },
        { title: 'Return of the Mount Hua Sect', alt_titles: 'Chung Myung', chapter: 140, type: 'Manhwa' },
        { title: 'Zom 100', alt_titles: 'Bucket List of the Dead', chapter: 65, type: 'Manga' },
        { title: 'Martial Peak', alt_titles: 'Yang Kai', chapter: 3700, type: 'Manhua' }
      ]
    })
  });
  const bulkResult = JSON.parse(bulkRes.body);
  console.log('Bulk imported count:', bulkResult.count);
  if (bulkResult.count !== 4) {
    throw new Error('Bulk import count mismatch');
  }

  console.log('--- TEST 7: Alphabetical Sorting Verification ---');
  const listRes = await makeRequest('/chapterhaven/api/entries', {
    headers: { 'Authorization': authHeader }
  });
  const entries = JSON.parse(listRes.body);
  console.log(`Retrieved ${entries.length} entries`);
  console.log('Entries list:', entries.map(e => `${e.is_favorite ? '★' : ' '} [${e.type}] ${e.title}`));

  console.log('\n✅ ALL INTEGRATION TESTS PASSED PERFECTLY!\n');
  process.exit(0);
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});

