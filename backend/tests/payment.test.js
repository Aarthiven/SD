const request = require('supertest');
const app     = require('../src/app');
const prisma  = require('../src/config/db');
const uuidv4  = () => require('crypto').randomUUID();
const { createTestUser, createTestProduct, cleanupProduct, cleanupUser } = require('./helpers/setup');

/** Helper: reserve → checkout → return { order, product, user } */
const setupOrderForPayment = async () => {
  const product = await createTestProduct(10);
  const user    = await createTestUser();

  const reserveRes = await request(app)
    .post(`/api/inventory/${product.id}/reserve`)
    .send({ userId: user.id, quantity: 1, idempotencyKey: uuidv4() });

  expect(reserveRes.status).toBe(201);
  const reservation = reserveRes.body.data;

  const checkoutRes = await request(app)
    .post('/api/checkout')
    .send({ reservationId: reservation.id, userId: user.id });

  expect(checkoutRes.status).toBe(201);
  return { order: checkoutRes.body.data, product, user };
};

describe('Payment — SUCCESS', () => {
  let ctx;

  beforeAll(async () => { ctx = await setupOrderForPayment(); });
  afterAll(async () => {
    await cleanupProduct(ctx.product.id);
    await cleanupUser(ctx.user.id);
    await prisma.$disconnect();
  });

  test('SUCCESS payment confirms the order', async () => {
    const res = await request(app).post('/api/payments').send({
      orderId:        ctx.order.id,
      amount:         999,
      status:         'SUCCESS',
      idempotencyKey: uuidv4(),
    });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('SUCCESS');
  });

  test('order status becomes CONFIRMED after SUCCESS payment', async () => {
    const order = await prisma.order.findUnique({ where: { id: ctx.order.id } });
    expect(order.status).toBe('CONFIRMED');
  });

  test('inventory moves reserved → sold after SUCCESS payment', async () => {
    const inv = await prisma.inventory.findUnique({ where: { productId: ctx.product.id } });
    expect(inv.soldQuantity).toBe(1);
    expect(inv.reservedQuantity).toBe(0);
  });
});

describe('Payment — FAILED', () => {
  let ctx;

  beforeAll(async () => { ctx = await setupOrderForPayment(); });
  afterAll(async () => {
    await cleanupProduct(ctx.product.id);
    await cleanupUser(ctx.user.id);
    await prisma.$disconnect();
  });

  test('FAILED payment cancels the order', async () => {
    const res = await request(app).post('/api/payments').send({
      orderId:        ctx.order.id,
      amount:         999,
      status:         'FAILED',
      idempotencyKey: uuidv4(),
    });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('FAILED');
  });

  test('order status becomes CANCELLED after FAILED payment', async () => {
    const order = await prisma.order.findUnique({ where: { id: ctx.order.id } });
    expect(order.status).toBe('CANCELLED');
  });

  test('inventory is fully restored after FAILED payment', async () => {
    const inv = await prisma.inventory.findUnique({ where: { productId: ctx.product.id } });
    expect(inv.availableQuantity).toBe(10); // back to original
    expect(inv.reservedQuantity).toBe(0);
    expect(inv.soldQuantity).toBe(0);
  });

  test('reservation status becomes RELEASED after FAILED payment', async () => {
    const inv = await prisma.inventory.findUnique({ where: { productId: ctx.product.id } });
    const res = await prisma.inventoryReservation.findFirst({ where: { inventoryId: inv.id } });
    expect(res.status).toBe('RELEASED');
  });
});

describe('Payment — TIMEOUT', () => {
  let ctx;

  beforeAll(async () => { ctx = await setupOrderForPayment(); });
  afterAll(async () => {
    await cleanupProduct(ctx.product.id);
    await cleanupUser(ctx.user.id);
    await prisma.$disconnect();
  });

  test('TIMEOUT payment records the event without changing inventory', async () => {
    const invBefore = await prisma.inventory.findUnique({ where: { productId: ctx.product.id } });

    const res = await request(app).post('/api/payments').send({
      orderId:        ctx.order.id,
      amount:         999,
      status:         'TIMEOUT',
      idempotencyKey: uuidv4(),
    });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('TIMEOUT');

    const invAfter = await prisma.inventory.findUnique({ where: { productId: ctx.product.id } });
    // Inventory unchanged — order is recoverable
    expect(invAfter.availableQuantity).toBe(invBefore.availableQuantity);
    expect(invAfter.reservedQuantity).toBe(invBefore.reservedQuantity);
  });

  test('order remains in PAYMENT_PENDING after TIMEOUT', async () => {
    const order = await prisma.order.findUnique({ where: { id: ctx.order.id } });
    expect(order.status).toBe('PAYMENT_PENDING');
  });
});

describe('Payment — Duplicate idempotencyKey', () => {
  let ctx;
  const PAYMENT_KEY = uuidv4();

  beforeAll(async () => { ctx = await setupOrderForPayment(); });
  afterAll(async () => {
    await cleanupProduct(ctx.product.id);
    await cleanupUser(ctx.user.id);
    await prisma.$disconnect();
  });

  test('first payment with key succeeds', async () => {
    const res = await request(app).post('/api/payments').send({
      orderId:        ctx.order.id,
      amount:         999,
      status:         'SUCCESS',
      idempotencyKey: PAYMENT_KEY,
    });
    expect(res.status).toBe(201);
    expect(res.body.idempotent).toBe(false);
  });

  test('duplicate payment with same key returns original without re-processing', async () => {
    const res = await request(app).post('/api/payments').send({
      orderId:        ctx.order.id,
      amount:         999,
      status:         'FAILED', // even if status differs — original wins
      idempotencyKey: PAYMENT_KEY,
    });
    expect(res.status).toBe(200);
    expect(res.body.idempotent).toBe(true);
    expect(res.body.data.status).toBe('SUCCESS'); // original result preserved
  });

  test('only 1 payment record exists for this order', async () => {
    const count = await prisma.payment.count({ where: { orderId: ctx.order.id } });
    expect(count).toBe(1);
  });
});
