const paymentService = require('../services/payment.service');
const { validate: isUuid } = require('uuid');

const processPayment = async (req, res, next) => {
  try {
    const { orderId, amount, status, idempotencyKey } = req.body;

    if (!orderId)        throw Object.assign(new Error('orderId is required'),        { statusCode: 400 });
    if (!amount)         throw Object.assign(new Error('amount is required'),          { statusCode: 400 });
    if (!status)         throw Object.assign(new Error('status is required'),          { statusCode: 400 });
    if (!idempotencyKey) throw Object.assign(new Error('idempotencyKey is required'), { statusCode: 400 });
    if (!isUuid(orderId)) throw Object.assign(new Error('Invalid orderId'),            { statusCode: 400 });
    if (typeof amount !== 'number' || amount <= 0)
      throw Object.assign(new Error('amount must be a positive number'), { statusCode: 400 });

    const { payment, idempotent } = await paymentService.processPayment({
      orderId, amount, status, idempotencyKey,
    });

    res.status(idempotent ? 200 : 201).json({
      success: true,
      idempotent,
      data: payment,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { processPayment };
