const { validate: isUuid } = require('uuid');

const validateProductId = (id) => {
  if (!isUuid(id)) {
    const err = new Error('Invalid product ID');
    err.statusCode = 400;
    throw err;
  }
};

const validateProductBody = (body, requireAll = true) => {
  const { name, price, availableQuantity } = body;

  if (requireAll && !name) {
    const err = new Error('Product name is required');
    err.statusCode = 400;
    throw err;
  }

  if (requireAll && (price === undefined || price === null)) {
    const err = new Error('Product price is required');
    err.statusCode = 400;
    throw err;
  }

  if (price !== undefined && price !== null && price <= 0) {
    const err = new Error('Price must be greater than 0');
    err.statusCode = 400;
    throw err;
  }

  if (availableQuantity !== undefined && availableQuantity < 0) {
    const err = new Error('Quantity must not be negative');
    err.statusCode = 400;
    throw err;
  }
};

module.exports = { validateProductId, validateProductBody };
