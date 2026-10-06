const paymentRepo = require('../repositories/payment.repository');

const VALID_STATUSES = ['SUCCESS', 'FAILED', 'TIMEOUT'];

const processPayment = async ({ orderId, amount, status, idempotencyKey }) => {
  if (!VALID_STATUSES.includes(status)) {
    const err = new Error(`Invalid payment status. Must be one of: ${VALID_STATUSES.join(', ')}`);
    err.statusCode = 400;
    throw err;
  }

  return paymentRepo.processPayment({ orderId, amount, status, idempotencyKey });
};

module.exports = { processPayment };
