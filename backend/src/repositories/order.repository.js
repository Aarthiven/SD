const prisma = require('../config/db');

/**
 * Checkout: verify reservation → mark PAYMENT_PENDING → create Order + OrderItem.
 * All inside a single transaction.
 */
const checkout = async ({ reservationId, userId }) => {
  return prisma.$transaction(async (tx) => {
    // 1. Fetch reservation with inventory → product
    const reservation = await tx.inventoryReservation.findUnique({
      where: { id: reservationId },
      include: {
        inventory: {
          include: { product: true },
        },
      },
    });

    if (!reservation) {
      const err = new Error('Reservation not found');
      err.statusCode = 404;
      throw err;
    }

    if (reservation.userId !== userId) {
      const err = new Error('Reservation does not belong to this user');
      err.statusCode = 403;
      throw err;
    }

    if (reservation.status !== 'RESERVED') {
      const err = new Error(`Reservation is not in RESERVED state (current: ${reservation.status})`);
      err.statusCode = 409;
      throw err;
    }

    if (new Date() > reservation.expiresAt) {
      // Mark as expired and reject
      await tx.inventoryReservation.update({
        where: { id: reservationId },
        data:  { status: 'EXPIRED' },
      });
      const err = new Error('Reservation has expired');
      err.statusCode = 410;
      throw err;
    }

    const { product, id: inventoryId } = reservation.inventory;
    const totalPrice = product.price * reservation.quantity;

    // 2. Move reservation to PAYMENT_PENDING
    await tx.inventoryReservation.update({
      where: { id: reservationId },
      data:  { status: 'PAYMENT_PENDING' },
    });

    // 3. Create Order + OrderItem
    const order = await tx.order.create({
      data: {
        userId,
        reservationId,
        status:     'PAYMENT_PENDING',
        totalPrice,
        items: {
          create: {
            productId: product.id,
            quantity:  reservation.quantity,
            unitPrice: product.price,
          },
        },
      },
      include: { items: true },
    });

    return order;
  });
};

const findOrderById = (id) => {
  return prisma.order.findUnique({
    where: { id },
    include: {
      items:   { include: { product: true } },
      payment: true,
      reservation: true,
    },
  });
};

module.exports = { checkout, findOrderById };
