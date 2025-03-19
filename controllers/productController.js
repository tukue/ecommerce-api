const Product = require('../models/product');

// controllers/productController.js
const productController = {
  async createProduct(req, res) {
    try {
      const product = await req.models.Product.create(req.body);
      return res.status(201).json(product);
    } catch (error) {
      console.error('Error creating product:', error);
      return res.status(500).json({ error: error.message });
    }
  },

  async getAllProducts(req, res) {
    try {
      const products = await req.models.Product.findAll();
      return res.status(200).json(products);
    } catch (error) {
      console.error('Error getting products:', error);
      return res.status(500).json({ error: error.message });
    }
  },

  async getProductById(req, res) {
    try {
      const product = await req.models.Product.findByPk(req.params.id);
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
      return res.status(200).json(product);
    } catch (error) {
      console.error('Error getting product:', error);
      return res.status(500).json({ error: error.message });
    }
  },

  async updateProduct(req, res) {
    try {
      const product = await req.models.Product.findByPk(req.params.id);
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
      await product.update(req.body);
      return res.status(200).json(product);
    } catch (error) {
      console.error('Error updating product:', error);
      return res.status(500).json({ error: error.message });
    }
  },

  async deleteProduct(req, res) {
    try {
      const product = await req.models.Product.findByPk(req.params.id);
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
      await product.destroy();
      return res.status(200).json({ message: 'Product deleted successfully' });
    } catch (error) {
      console.error('Error deleting product:', error);
      return res.status(500).json({ error: error.message });
    }
  }
};

module.exports = productController;
