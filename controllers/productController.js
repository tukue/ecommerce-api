const asyncHandler = require('../utils/asyncHandler');
const ProductService = require('../services/productService');

function service(req) {
  return new ProductService(req.models.Product);
}

module.exports = {
  createProduct: asyncHandler(async (req, res) => {
    const product = await service(req).createProduct(req.body);
    res.status(201).json(product);
  }),

  getAllProducts: asyncHandler(async (req, res) => {
    const products = await service(req).getAllProducts();
    res.status(200).json(products);
  }),

  getProductById: asyncHandler(async (req, res) => {
    const product = await service(req).getProductById(req.params.id);
    res.status(200).json(product);
  }),

  updateProduct: asyncHandler(async (req, res) => {
    const product = await service(req).updateProduct(req.params.id, req.body);
    res.status(200).json(product);
  }),

  deleteProduct: asyncHandler(async (req, res) => {
    await service(req).deleteProduct(req.params.id);
    res.status(200).json({ message: 'Product deleted successfully' });
  }),

  searchProductsByName: asyncHandler(async (req, res) => {
    const products = await service(req).searchProductsByName(req.query.name);
    res.status(200).json(products);
  }),
};
