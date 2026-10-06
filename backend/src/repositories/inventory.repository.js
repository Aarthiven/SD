const prisma = require('../config/db');

/**
 * Reserve inventory inside a serialized transaction with row-level lock.
 * Uses SELECT FOR UPDATE to prevent concurrent overselling.
 */
const reserveInventory = async ({ productId, userId, quantity, idempotencyKey }) => {
  return prisma.$transaction(async (tx) => {
    // 1. Idempotency check — if key exists, return the existing reservation
    const existing = await tx.inventoryReservation.findUnique({
      where: { idempotencyKey },
    });
    if (existing) return { reservation: existing, idempotent: true };

    // 2. Lock the inventory row (SELECT FOR UPDATE prevents concurrent writes)
    const rows = await tx.$queryRaw`
      SELECT * FROM "Inventory"
      WHERE "productId" = ${productId}
      FOR UPDATE
    `;

    if (!rows || rows.length === 0) {
      const err = new Error('Inventory not found for this product');
      err.statusCode = 404;
      throw err;
    }

    const inventory = rows[0];

    // 3. Guard: available quantity must cover the request
    if (inventory.availableQuantity < quantity) {
      const err = new Error('Insufficient inventory');
      err.statusCode = 409;
      throw err;
    }

    // 4. Atomic update — decrement available, increment reserved
    const updatedInventory = await tx.inventory.update({
      where: { id: inventory.id },
      data: {
        availableQuantity: { decrement: quantity },
        reservedQuantity:  { increment: quantity },
        version:           { increment: 1 },
      },
    });

    // 5. Safety net: reject if available somehow went negative (belt-and-suspenders)
    if (updatedInventory.availableQuantity < 0) {
      const err = new Error('Inventory update would result in negative quantity');
      err.statusCode = 409;
      throw err;
    }

    // 6. Create reservation record
    const reservation = await tx.inventoryReservation.create({
      data: {
        inventoryId:    inventory.id,
        userId,
        quantity,
        status:         'RESERVED',
        idempotencyKey,
        expiresAt:      new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      },
    });

    return { reservation, idempotent: false };
  });
};

/**
 * Find a reservation by its primary key.
 */
const findById = (id) => {
  return prisma.inventoryReservation.findUnique({
    where: { id },
    include: { inventory: { include: { product: true } } },
  });
};

/**
 * Release a reservation inside a transaction with row-level lock.
 */
const releaseReservation = async (reservationId) => {
  return prisma.$transaction(async (tx) => {
    // Fetch reservation to get inventoryId and current status
    const reservation = await tx.inventoryReservation.findUnique({
      where: { id: reservationId },
    });

    if (!reservation) {
      const err = new Error('Reservation not found');
      err.statusCode = 404;
      throw err;
    }

    if (reservation.status !== 'RESERVED') {
      const err = new Error(`Cannot release a reservation with status: ${reservation.status}`);
      err.statusCode = 409;
      throw err;
    }

    // Lock the inventory row before restoring quantities
    await tx.$queryRaw`
      SELECT id FROM "Inventory"
      WHERE id = ${reservation.inventoryId}
      FOR UPDATE
    `;

    // Restore quantities
    await tx.inventory.update({
      where: { id: reservation.inventoryId },
      data: {
        availableQuantity: { increment: reservation.quantity },
        reservedQuantity:  { decrement: reservation.quantity },
        version:           { increment: 1 },
      },
    });

    // Mark reservation as RELEASED
    const updated = await tx.inventoryReservation.update({
      where: { id: reservationId },
      data:  { status: 'RELEASED' },
    });

    return updated;
  });
};

module.exports = { reserveInventory, findById, releaseReservation };
