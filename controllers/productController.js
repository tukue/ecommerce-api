const asyncHandler = require('../utils/asyncHandler');
const { getProductService } = require('../config/container');

module.exports = {
  createProduct: asyncHandler(async (req, res) => {
    const product = await getProductService(req.models).createProduct(req.body);
    res.status(201).json(product);
  }),

  getAllProducts: asyncHandler(async (req, res) => {
    const products = await getProductService(req.models).getAllProducts();
    res.status(200).json(products);
  }),

  getProductById: asyncHandler(async (req, res) => {
    const product = await getProductService(req.models).getProductById(req.params.id);
    res.status(200).json(product);
  }),

  updateProduct: asyncHandler(async (req, res) => {
    const product = await getProductService(req.models).updateProduct(req.params.id, req.body);
    res.status(200).json(product);
  }),

  deleteProduct: asyncHandler(async (req, res) => {
    await getProductService(req.models).deleteProduct(req.params.id);
    res.status(200).json({ message: 'Product deleted successfully' });
  }),

  searchProductsByName: asyncHandler(async (req, res) => {
    const products = await getProductService(req.models).searchProductsByName(req.query.name);
    res.status(200).json(products);
  }),
};
