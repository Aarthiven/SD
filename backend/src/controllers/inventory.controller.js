const inventoryService = require('../services/inventory.service');
const { validateProductId } = require('../utils/validators');
const { validate: isUuid } = require('uuid');

const reserve = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { userId, quantity, idempotencyKey } = req.body;

    validateProductId(productId);

    if (!userId)         throw Object.assign(new Error('userId is required'), { statusCode: 400 });
    if (!idempotencyKey) throw Object.assign(new Error('idempotencyKey is required'), { statusCode: 400 });
    if (!quantity || quantity < 1)
      throw Object.assign(new Error('quantity must be at least 1'), { statusCode: 400 });
    if (!isUuid(userId))
      throw Object.assign(new Error('Invalid userId'), { statusCode: 400 });

    const { reservation, idempotent } = await inventoryService.reserveInventory({
      productId,
      userId,
      quantity,
      idempotencyKey,
    });

    res.status(idempotent ? 200 : 201).json({
      success: true,
      idempotent,
      data: reservation,
    });
  } catch (err) {
    next(err);
  }
};

const getReservation = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isUuid(id)) throw Object.assign(new Error('Invalid reservation ID'), { statusCode: 400 });

    const reservation = await inventoryService.getReservationById(id);
    res.status(200).json({ success: true, data: reservation });
  } catch (err) {
    next(err);
  }
};

const release = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isUuid(id)) throw Object.assign(new Error('Invalid reservation ID'), { statusCode: 400 });

    const reservation = await inventoryService.releaseReservation(id);
    res.status(200).json({ success: true, data: reservation });
  } catch (err) {
    next(err);
  }
};

module.exports = { reserve, getReservation, release };
