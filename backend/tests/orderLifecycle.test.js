const request = require('supertest');
const app     = require('../src/app');
const prisma  = require('../src/config/db');
const uuidv4  = () => require('crypto').randomUUID();
const { createTestUser, createTestProduct, cleanupProduct, cleanupUser } = require('./helpers/setup');

describe('Order Lifecycle — Success Path (RESERVED → CONFIRMED)', () => {
  let product, user, reservation, order;

  beforeAll(async () => {
    product = await createTestProduct(10);
    user    = await createTestUser();
  });

  afterAll(async () => {
    await cleanupProduct(product.id);
    await cleanupUser(user.id);
    await prisma.$disconnect();
  });

  test('Step 1: Reserve inventory → status RESERVED', async () => {
    const res = await request(app)
      .post(`/api/inventory/${product.id}/reserve`)
      .send({ userId: user.id, quantity: 2, idempotencyKey: uuidv4() });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('RESERVED');
    reservation = res.body.data;
  });

  test('Step 1 inventory: available=8, reserved=2', async () => {
    const inv = await prisma.inventory.findUnique({ where: { productId: product.id } });
    expect(inv.availableQuantity).toBe(8);
    expect(inv.reservedQuantity).toBe(2);
    expect(inv.soldQuantity).toBe(0);
  });

  test('Step 2: Checkout → reservation moves to PAYMENT_PENDING, order created', async () => {
    const res = await request(app)
      .post('/api/checkout')
      .send({ reservationId: reservation.id, userId: user.id });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('PAYMENT_PENDING');
    expect(res.body.data.totalPrice).toBe(999 * 2);
    expect(res.body.data.items).toHaveLength(1);
    order = res.body.data;

    const resRecord = await prisma.inventoryReservation.findUnique({ where: { id: reservation.id } });
    expect(resRecord.status).toBe('PAYMENT_PENDING');
  });

  test('Step 3: SUCCESS payment → order CONFIRMED, sold quantity increases', async () => {
    const res = await request(app).post('/api/payments').send({
      orderId:        order.id,
      amount:         999 * 2,
      status:         'SUCCESS',
      idempotencyKey: uuidv4(),
    });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('SUCCESS');

    const finalOrder = await prisma.order.findUnique({ where: { id: order.id } });
    expect(finalOrder.status).toBe('CONFIRMED');

    const inv = await prisma.inventory.findUnique({ where: { productId: product.id } });
    expect(inv.availableQuantity).toBe(8);
    expect(inv.reservedQuantity).toBe(0);
    expect(inv.soldQuantity).toBe(2);
  });

  test('GET /api/orders/:id returns full order with items and payment', async () => {
    const res = await request(app).get(`/api/orders/${order.id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('CONFIRMED');
    expect(res.body.data.payment.status).toBe('SUCCESS');
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].quantity).toBe(2);
  });
});

describe('Order Lifecycle — Failure Path (RESERVED → CANCELLED, inventory released)', () => {
  let product, user, reservation, order;

  beforeAll(async () => {
    product = await createTestProduct(10);
    user    = await createTestUser();
  });

  afterAll(async () => {
    await cleanupProduct(product.id);
    await cleanupUser(user.id);
    await prisma.$disconnect();
  });

  test('Reserve, then checkout', async () => {
    const resR = await request(app)
      .post(`/api/inventory/${product.id}/reserve`)
      .send({ userId: user.id, quantity: 3, idempotencyKey: uuidv4() });
    expect(resR.status).toBe(201);
    reservation = resR.body.data;

    const resC = await request(app)
      .post('/api/checkout')
      .send({ reservationId: reservation.id, userId: user.id });
    expect(resC.status).toBe(201);
    order = resC.body.data;
  });

  test('FAILED payment → order CANCELLED, inventory fully restored', async () => {
    const res = await request(app).post('/api/payments').send({
      orderId:        order.id,
      amount:         999 * 3,
      status:         'FAILED',
      idempotencyKey: uuidv4(),
    });

    expect(res.status).toBe(201);

    const finalOrder = await prisma.order.findUnique({ where: { id: order.id } });
    expect(finalOrder.status).toBe('CANCELLED');

    const inv = await prisma.inventory.findUnique({ where: { productId: product.id } });
    expect(inv.availableQuantity).toBe(10); // fully restored
    expect(inv.reservedQuantity).toBe(0);
    expect(inv.soldQuantity).toBe(0);
  });

  test('cannot checkout an already released reservation', async () => {
    const res = await request(app)
      .post('/api/checkout')
      .send({ reservationId: reservation.id, userId: user.id });

    // Reservation is now RELEASED — checkout must reject it
    expect(res.status).toBe(409);
  });
});
