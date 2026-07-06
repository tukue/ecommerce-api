const { Sequelize, DataTypes } = require('sequelize');
const ProductModel = require('../models/product');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: ':memory:',
  logging: false,
});

const Product = ProductModel(sequelize, DataTypes);

describe('Product Model', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  afterEach(async () => {
    await Product.destroy({ where: {}, truncate: true });
  });

  it('should create a product successfully', async () => {
    const validProduct = {
      name: 'Test Product',
      description: 'This is a test product',
      price: 100.0,
      stock: 10,
    };

    const product = await Product.create(validProduct);

    expect(product).toBeDefined();
    expect(product.name).toBe(validProduct.name);
    expect(product.description).toBe(validProduct.description);
    expect(product.price).toBe(validProduct.price);
    expect(product.stock).toBe(validProduct.stock);
  });

  it('should not create a product without required fields', async () => {
    const invalidProduct = {
      name: 'Test Product',
    };

    await expect(Product.create(invalidProduct)).rejects.toThrow();
  });

  it('should not create a product with negative price', async () => {
    const invalidProduct = {
      name: 'Test Product',
      description: 'This is a test product',
      price: -100.0,
      stock: 10,
    };

    await expect(Product.create(invalidProduct)).rejects.toThrow();
  });

  it('should not create a product with negative stock', async () => {
    const invalidProduct = {
      name: 'Test Product',
      description: 'This is a test product',
      price: 100.0,
      stock: -10,
    };

    await expect(Product.create(invalidProduct)).rejects.toThrow();
  });
});
