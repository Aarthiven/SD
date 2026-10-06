const orderRepo = require('../repositories/order.repository');

const checkout = async ({ reservationId, userId }) => {
  return orderRepo.checkout({ reservationId, userId });
};

const getOrderById = async (id) => {
  const order = await orderRepo.findOrderById(id);
  if (!order) {
    const err = new Error('Order not found');
    err.statusCode = 404;
    throw err;
  }
  return order;
};

module.exports = { checkout, getOrderById };
