const Product = require('../models/product');

const productController = {
  // Create a new product
  createProduct: async (req, res) => {
    try {
      const { name, description, price, stock } = req.body;
      const product = await Product.create({ name, description, price, stock });
      res.status(201).json(product);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Get all products
  getAllProducts: async (req, res) => {
    try {
      const products = await Product.findAll();
      res.status(200).json(products);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Get product by ID
  getProductById: async (req, res) => {
    try {
      const product = await Product.findByPk(req.params.id);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }
      res.status(200).json(product);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Update product by ID
  updateProduct: async (req, res) => {
    try {
      const updatedProduct = await Product.update(req.body, {
        where: { id: req.params.id },
        returning: true,
      });
      if (!updatedProduct[0]) {
        return res.status(404).json({ message: 'Product not found' });
      }
      res.status(200).json(updatedProduct[1][0]);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Delete product by ID
  deleteProduct: async (req, res) => {
    try {
      const deletedProduct = await Product.destroy({
        where: { id: req.params.id },
      });
      if (!deletedProduct) {
        return res.status(404).json({ message: 'Product not found' });
      }
      res.status(200).json({ message: 'Product deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
};

module.exports = productController;