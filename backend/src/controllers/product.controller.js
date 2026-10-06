const productService = require('../services/product.service');
const { validateProductId, validateProductBody } = require('../utils/validators');

const getAllProducts = async (req, res, next) => {
  try {
    const products = await productService.getAllProducts();
    res.status(200).json({ success: true, data: products });
  } catch (err) {
    next(err);
  }
};

const getProductById = async (req, res, next) => {
  try {
    validateProductId(req.params.id);
    const product = await productService.getProductById(req.params.id);
    res.status(200).json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
};

const createProduct = async (req, res, next) => {
  try {
    validateProductBody(req.body, true);
    const product = await productService.createProduct(req.body);
    res.status(201).json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
};

const updateProduct = async (req, res, next) => {
  try {
    validateProductId(req.params.id);
    validateProductBody(req.body, false);
    const product = await productService.updateProduct(req.params.id, req.body);
    res.status(200).json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
};

const deleteProduct = async (req, res, next) => {
  try {
    validateProductId(req.params.id);
    await productService.deleteProduct(req.params.id);
    res.status(200).json({ success: true, message: 'Product deleted successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};
