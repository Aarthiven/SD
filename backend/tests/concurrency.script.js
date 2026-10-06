/**
 * SALESTORM Concurrency Test
 * ---------------------------
 * Fires 200 simultaneous reserve requests against a product with 100 units.
 * Validates:
 *   - Successful reservations <= 100
 *   - availableQuantity >= 0
 *   - reservedQuantity <= 100
 *
 * Usage:
 *   node tests/concurrency.test.js <productId> <baseUrl>
 *
 * Example:
 *   node tests/concurrency.test.js <uuid> http://localhost:5000
 */

const https = require('https');
const http  = require('http');

const PRODUCT_ID = process.argv[2];
const BASE_URL   = process.argv[3] || 'http://localhost:5000';
const TOTAL      = 200;

if (!PRODUCT_ID) {
  console.error('Usage: node tests/concurrency.test.js <productId> [baseUrl]');
  process.exit(1);
}

// Pre-generate unique user IDs and idempotency keys
const { v4: uuidv4 } = require('uuid');
const requests = Array.from({ length: TOTAL }, (_, i) => ({
  userId:         uuidv4(),
  quantity:       1,
  idempotencyKey: `concurrency-test-${i}-${Date.now()}`,
}));

const post = (url, body) =>
  new Promise((resolve) => {
    const data    = JSON.stringify(body);
    const parsed  = new URL(url);
    const lib     = parsed.protocol === 'https:' ? https : http;
    const options = {
      hostname: parsed.hostname,
      port:     parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path:     parsed.pathname,
      method:   'POST',
      headers:  { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
    };

    const req = lib.request(options, (res) => {
      let raw = '';
      res.on('data', (chunk) => (raw += chunk));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, body: raw }); }
      });
    });

    req.on('error', (e) => resolve({ status: 0, error: e.message }));
    req.write(data);
    req.end();
  });

const run = async () => {
  console.log(`\nSALESTORM Concurrency Test`);
  console.log(`Product : ${PRODUCT_ID}`);
  console.log(`Requests: ${TOTAL} concurrent reserve requests (each qty=1)`);
  console.log(`Expected: at most 100 successes, 0 negative inventory\n`);

  const url = `${BASE_URL}/api/inventory/${PRODUCT_ID}/reserve`;

  const results = await Promise.all(requests.map((body) => post(url, body)));

  const successes = results.filter((r) => r.status === 201 || r.status === 200);
  const failures  = results.filter((r) => r.status === 409);
  const errors    = results.filter((r) => r.status !== 201 && r.status !== 200 && r.status !== 409);

  console.log(`✅ Successes (201/200) : ${successes.length}`);
  console.log(`🚫 Rejected (409)      : ${failures.length}`);
  console.log(`❌ Errors (other)      : ${errors.length}`);

  // Fetch live inventory to verify
  const inventoryUrl = `${BASE_URL}/api/products/${PRODUCT_ID}`;
  const invResult    = await new Promise((resolve) => {
    const lib    = BASE_URL.startsWith('https') ? https : http;
    const parsed = new URL(inventoryUrl);
    lib.get(inventoryUrl, (res) => {
      let raw = '';
      res.on('data', (c) => (raw += c));
      res.on('end', () => resolve(JSON.parse(raw)));
    }).on('error', resolve);
  });

  const inv = invResult.data?.inventory;
  console.log(`\n--- Live Inventory State ---`);
  console.log(`availableQuantity : ${inv?.availableQuantity}`);
  console.log(`reservedQuantity  : ${inv?.reservedQuantity}`);
  console.log(`soldQuantity      : ${inv?.soldQuantity}`);
  console.log(`version           : ${inv?.version}`);

  console.log('\n--- Assertions ---');
  let passed = true;

  if (successes.length > 100) {
    console.log(`❌ FAIL: ${successes.length} reservations succeeded (expected ≤ 100)`);
    passed = false;
  } else {
    console.log(`✅ PASS: reservations capped at ${successes.length} (≤ 100)`);
  }

  if (inv?.availableQuantity < 0) {
    console.log(`❌ FAIL: availableQuantity is negative (${inv.availableQuantity})`);
    passed = false;
  } else {
    console.log(`✅ PASS: availableQuantity is non-negative (${inv?.availableQuantity})`);
  }

  if (inv?.reservedQuantity > 100) {
    console.log(`❌ FAIL: reservedQuantity exceeded 100 (${inv.reservedQuantity})`);
    passed = false;
  } else {
    console.log(`✅ PASS: reservedQuantity within bounds (${inv?.reservedQuantity})`);
  }

  console.log(passed ? '\n🎉 All assertions passed!' : '\n💥 Some assertions failed!');
};

run().catch(console.error);
