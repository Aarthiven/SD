const request = require('supertest');
const app     = require('../src/app');
const prisma  = require('../src/config/db');
const { createTestUser, createTestProduct, cleanupProduct, cleanupUser } = require('./helpers/setup');

describe('Idempotency Key — Duplicate Reservation Prevention', () => {
  let product, user;
  const SHARED_KEY = `idempotency-test-${Date.now()}`;

  beforeAll(async () => {
    product = await createTestProduct(100);
    user    = await createTestUser();
  });

  afterAll(async () => {
    await cleanupProduct(product.id);
    await cleanupUser(user.id);
    await prisma.$disconnect();
  });

  test('5 concurrent requests with the same idempotencyKey create exactly 1 reservation', async () => {
    const payload = {
      userId:         user.id,
      quantity:       1,
      idempotencyKey: SHARED_KEY,
    };

    // Fire 5 simultaneous identical requests
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        request(app).post(`/api/inventory/${product.id}/reserve`).send(payload)
      )
    );

    const successStatuses = results.filter((r) => r.status === 200 || r.status === 201);
    expect(successStatuses.length).toBe(5); // all return 200/201 (idempotent)

    // Only 1 reservation record should exist in the DB for this key
    const count = await prisma.inventoryReservation.count({
      where: { idempotencyKey: SHARED_KEY },
    });
    expect(count).toBe(1);
  });

  test('inventory is only decremented once despite 5 requests', async () => {
    const inv = await prisma.inventory.findUnique({ where: { productId: product.id } });
    // 1 unit reserved, 99 still available
    expect(inv.reservedQuantity).toBe(1);
    expect(inv.availableQuantity).toBe(99);
  });

  test('sequential duplicate requests also return the existing reservation', async () => {
    const payload = { userId: user.id, quantity: 1, idempotencyKey: SHARED_KEY };

    const r1 = await request(app).post(`/api/inventory/${product.id}/reserve`).send(payload);
    const r2 = await request(app).post(`/api/inventory/${product.id}/reserve`).send(payload);

    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    expect(r1.body.data.id).toBe(r2.body.data.id); // same reservation returned
    expect(r1.body.idempotent).toBe(true);
    expect(r2.body.idempotent).toBe(true);
  });
});
