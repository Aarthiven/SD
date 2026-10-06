const request = require('supertest');
const app     = require('../src/app');
const prisma  = require('../src/config/db');
const uuidv4  = () => require('crypto').randomUUID();
const { createTestUser, createTestProduct, cleanupProduct, cleanupUser } = require('./helpers/setup');

describe('Overselling Prevention', () => {
  let product;
  const users = [];

  beforeAll(async () => {
    // Create a product with exactly 100 units
    product = await createTestProduct(100);
    // Create 10 users to spread requests across
    for (let i = 0; i < 10; i++) {
      users.push(await createTestUser());
    }
  });

  afterAll(async () => {
    await cleanupProduct(product.id);
    for (const u of users) await cleanupUser(u.id);
    await prisma.$disconnect();
  });

  test('200 concurrent reserve requests must not exceed 100 successes', async () => {
    // Fire 200 simultaneous requests, each for quantity 1
    const requests = Array.from({ length: 200 }, (_, i) =>
      request(app)
        .post(`/api/inventory/${product.id}/reserve`)
        .send({
          userId:         users[i % users.length].id,
          quantity:       1,
          idempotencyKey: uuidv4(), // unique per request — no idempotency reuse
        })
    );

    const results   = await Promise.all(requests);
    const successes = results.filter((r) => r.status === 201);
    const conflicts = results.filter((r) => r.status === 409);

    console.log(`✅ Succeeded: ${successes.length} | 🚫 Rejected (409): ${conflicts.length}`);

    // Core assertion: never oversell
    expect(successes.length).toBeLessThanOrEqual(100);
    expect(successes.length + conflicts.length).toBe(200);
  });

  test('availableQuantity must never be negative', async () => {
    const inv = await prisma.inventory.findUnique({ where: { productId: product.id } });
    console.log(`📦 Inventory state → available: ${inv.availableQuantity}, reserved: ${inv.reservedQuantity}`);

    expect(inv.availableQuantity).toBeGreaterThanOrEqual(0);
  });

  test('reservedQuantity must not exceed 100', async () => {
    const inv = await prisma.inventory.findUnique({ where: { productId: product.id } });
    expect(inv.reservedQuantity).toBeLessThanOrEqual(100);
  });

  test('available + reserved must equal 100 (no inventory leaked)', async () => {
    const inv = await prisma.inventory.findUnique({ where: { productId: product.id } });
    expect(inv.availableQuantity + inv.reservedQuantity).toBe(100);
  });
});
