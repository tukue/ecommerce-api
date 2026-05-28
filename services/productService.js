const HttpError = require('../utils/httpError');
const ProductRepository = require('../repositories/productRepository');

class ProductService {
  constructor(productModel) {
    this.repository = new ProductRepository(productModel);
  }

  async createProduct(input) {
    if (!input.name || input.price === undefined || input.stock === undefined) {
      throw new HttpError(400, 'name, price and stock are required', 'ValidationError');
    }

    if (Number(input.price) < 0 || Number(input.stock) < 0) {
      throw new HttpError(400, 'price and stock must be non-negative', 'ValidationError');
    }

    return this.repository.create(input);
  }

  async getAllProducts() {
    return this.repository.findAll();
  }

  async getProductById(id) {
    const productId = Number(id);
    if (!Number.isInteger(productId)) {
      throw new HttpError(400, 'Invalid product ID', 'ValidationError');
    }

    const product = await this.repository.findById(productId);
    if (!product) {
      throw new HttpError(404, 'Product not found', 'NotFoundError');
    }

    return product;
  }

  async updateProduct(id, payload) {
    const product = await this.getProductById(id);
    if (payload.price !== undefined && Number(payload.price) < 0) {
      throw new HttpError(400, 'price must be non-negative', 'ValidationError');
    }

    if (payload.stock !== undefined && Number(payload.stock) < 0) {
      throw new HttpError(400, 'stock must be non-negative', 'ValidationError');
    }

    await product.update(payload);
    return product;
  }

  async deleteProduct(id) {
    const product = await this.getProductById(id);
    await product.destroy();
  }

  async searchProductsByName(name) {
    if (!name) {
      throw new HttpError(400, 'name query parameter is required', 'ValidationError');
    }

    return this.repository.searchByName(name);
  }
}

module.exports = ProductService;
