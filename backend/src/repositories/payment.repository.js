const prisma = require('../config/db');

/**
 * Process a mock payment.
 * Uses a transaction to atomically update payment, reservation, inventory, and order.
 */
const processPayment = async ({ orderId, amount, status, idempotencyKey }) => {
  return prisma.$transaction(async (tx) => {
    // 1. Idempotency: return existing payment if key already used
    const existing = await tx.payment.findUnique({ where: { idempotencyKey } });
    if (existing) return { payment: existing, idempotent: true };

    // 2. Fetch order with reservation and inventory
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        reservation: {
          include: { inventory: true },
        },
      },
    });

    if (!order) {
      const err = new Error('Order not found');
      err.statusCode = 404;
      throw err;
    }

    if (order.status !== 'PAYMENT_PENDING') {
      const err = new Error(`Order is not awaiting payment (status: ${order.status})`);
      err.statusCode = 409;
      throw err;
    }

    const { reservation } = order;
    const { inventory }   = reservation;

    // 3. Create the payment record
    const payment = await tx.payment.create({
      data: { orderId, amount, status, idempotencyKey },
    });

    if (status === 'SUCCESS') {
      // Move reserved → sold
      await tx.inventory.update({
        where: { id: inventory.id },
        data:  {
          reservedQuantity: { decrement: reservation.quantity },
          soldQuantity:     { increment: reservation.quantity },
          version:          { increment: 1 },
        },
      });

      await tx.inventoryReservation.update({
        where: { id: reservation.id },
        data:  { status: 'CONFIRMED' },
      });

      await tx.order.update({
        where: { id: orderId },
        data:  { status: 'CONFIRMED' },
      });

    } else if (status === 'FAILED') {
      // Restore reserved → available
      await tx.inventory.update({
        where: { id: inventory.id },
        data:  {
          availableQuantity: { increment: reservation.quantity },
          reservedQuantity:  { decrement: reservation.quantity },
          version:           { increment: 1 },
        },
      });

      await tx.inventoryReservation.update({
        where: { id: reservation.id },
        data:  { status: 'RELEASED' },
      });

      await tx.order.update({
        where: { id: orderId },
        data:  { status: 'CANCELLED' },
      });

    }
    // TIMEOUT: only the payment record is created; order/reservation stay as-is for recovery.

    return { payment, idempotent: false };
  });
};

const findPaymentByOrderId = (orderId) => {
  return prisma.payment.findUnique({ where: { orderId } });
};

module.exports = { processPayment, findPaymentByOrderId };
