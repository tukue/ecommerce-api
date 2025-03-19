const request = require('supertest');
const express = require('express');
const { Sequelize, DataTypes } = require('sequelize');
const ProductModel = require('../models/product');
const productRoutes = require('../routes/productRoutes');

// Create test database connection
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: ':memory:',
  logging: false
});

// Initialize Product model
const Product = ProductModel(sequelize, DataTypes);

// Setup express app
const app = express();
app.use(express.json());

// Make Product model available in the routes
app.use((req, res, next) => {
  req.models = { Product };
  next();
});

// Use product routes
app.use('/api/products', productRoutes);

describe('Product Controller', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    await Product.destroy({ where: {}, truncate: true });
  });

  it('should create a product successfully', async () => {
    const productData = {
      name: 'Test Product',
      description: 'This is a test product',
      price: 100.0,
      stock: 10
    };

    const res = await request(app)
      .post('/api/products')
      .send(productData);

    expect(res.statusCode).toBe(201);
    expect(res.body.name).toBe('Test Product');
    expect(res.body.description).toBe('This is a test product');
    expect(res.body.price).toBe(100.0);
    expect(res.body.stock).toBe(10);
  });

  it('should get all products', async () => {
    await Product.create({
      name: 'Test Product',
      description: 'This is a test product',
      price: 100.0,
      stock: 10
    });

    const res = await request(app)
      .get('/api/products');

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
    expect(res.body[0].name).toBe('Test Product');
  });
it('should get a single product by id', async () => {
  const product = await Product.create({
    name: 'Test Product',
    description: 'This is a test product', 
    price: 100.0,
    stock: 10
  });

  const res = await request(app)
    .get(`/api/products/${product.id}`);

  expect(res.statusCode).toBe(200);
  expect(res.body.name).toBe('Test Product');
  expect(res.body.id).toBe(product.id);
});

it('should update a product', async () => {
  const product = await Product.create({
    name: 'Test Product',
    description: 'This is a test product',
    price: 100.0, 
    stock: 10
  });

  const updateData = {
    name: 'Updated Product',
    price: 200.0
  };

  const res = await request(app)
    .put(`/api/products/${product.id}`)
    .send(updateData);

  expect(res.statusCode).toBe(200);
  expect(res.body.name).toBe('Updated Product');
  expect(res.body.price).toBe(200.0);
  expect(res.body.description).toBe('This is a test product');
});


it('should return 404 when getting non-existent product', async () => {
  const res = await request(app)
    .get('/api/products/999');

  expect(res.statusCode).toBe(404);
});

});
