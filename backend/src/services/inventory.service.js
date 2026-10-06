const inventoryRepo = require('../repositories/inventory.repository');

const reserveInventory = async ({ productId, userId, quantity, idempotencyKey }) => {
  const { reservation, idempotent } = await inventoryRepo.reserveInventory({
    productId,
    userId,
    quantity,
    idempotencyKey,
  });
  return { reservation, idempotent };
};

const getReservationById = async (id) => {
  const reservation = await inventoryRepo.findById(id);
  if (!reservation) {
    const err = new Error('Reservation not found');
    err.statusCode = 404;
    throw err;
  }
  return reservation;
};

const releaseReservation = async (id) => {
  return inventoryRepo.releaseReservation(id);
};

module.exports = { reserveInventory, getReservationById, releaseReservation };
