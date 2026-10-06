const productRepo = require('../repositories/product.repository');

const getAllProducts = async () => {
  return productRepo.findAll();
};

const getProductById = async (id) => {
  const product = await productRepo.findById(id);
  if (!product) {
    const err = new Error('Product not found');
    err.statusCode = 404;
    throw err;
  }
  return product;
};

const createProduct = async (data) => {
  return productRepo.create(data);
};

const updateProduct = async (id, data) => {
  const product = await productRepo.findById(id);
  if (!product) {
    const err = new Error('Product not found');
    err.statusCode = 404;
    throw err;
  }
  return productRepo.update(id, data);
};

const deleteProduct = async (id) => {
  const product = await productRepo.findById(id);
  if (!product) {
    const err = new Error('Product not found');
    err.statusCode = 404;
    throw err;
  }

  const hasReservations = await productRepo.hasActiveReservations(id);
  if (hasReservations) {
    const err = new Error('Cannot delete product with active reservations');
    err.statusCode = 409;
    throw err;
  }

  return productRepo.remove(id);
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};
