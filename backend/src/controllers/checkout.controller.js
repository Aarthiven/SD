const orderService = require('../services/order.service');
const { validate: isUuid } = require('uuid');

const checkout = async (req, res, next) => {
  try {
    const { reservationId, userId } = req.body;

    if (!reservationId) throw Object.assign(new Error('reservationId is required'), { statusCode: 400 });
    if (!userId)        throw Object.assign(new Error('userId is required'),        { statusCode: 400 });
    if (!isUuid(reservationId)) throw Object.assign(new Error('Invalid reservationId'), { statusCode: 400 });
    if (!isUuid(userId))        throw Object.assign(new Error('Invalid userId'),        { statusCode: 400 });

    const order = await orderService.checkout({ reservationId, userId });
    res.status(201).json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
};

const getOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isUuid(id)) throw Object.assign(new Error('Invalid order ID'), { statusCode: 400 });

    const order = await orderService.getOrderById(id);
    res.status(200).json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
};

module.exports = { checkout, getOrderById };
