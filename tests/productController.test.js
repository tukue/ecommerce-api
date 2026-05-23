const request = require('supertest');
const express = require('express');
const { Sequelize, DataTypes } = require('sequelize');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const ProductModel = require('../models/product');
const UserModel = require('../models/user');
const OrderModel = require('../models/order');
const productRoutes = require('../routes/productRoutes');

process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '24h';

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: ':memory:',
  logging: false
});

const Product = ProductModel(sequelize, DataTypes);
const User = UserModel(sequelize, DataTypes);
const Order = OrderModel(sequelize, DataTypes);

User.hasMany(Order, { foreignKey: 'userId', as: 'orders' });
Product.hasMany(Order, { foreignKey: 'productId', as: 'orders' });
Order.belongsTo(User, { foreignKey: 'userId' });
Order.belongsTo(Product, { foreignKey: 'productId' });

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  req.models = { Product, User, Order };
  next();
});

app.use('/api/products', productRoutes);

const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
};

const createTestUser = async (role = 'user') => {
  const user = await User.create({
    username: `testuser_${Date.now()}`,
    email: `test_${Date.now()}@example.com`,
    password: 'Password123',
    role
  });
  return { user, token: generateToken(user.id) };
};

describe('Product Controller', () => {
  let adminToken;
  let userToken;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    await Product.destroy({ where: {}, truncate: true });
    await User.destroy({ where: {}, truncate: true });
    
    const adminData = await createTestUser('admin');
    const userData = await createTestUser('user');
    adminToken = adminData.token;
    userToken = userData.token;
  });

  describe('GET /api/products (public)', () => {
    it('should get all products without auth', async () => {
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

    it('should get a single product by id without auth', async () => {
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

    it('should return 404 when getting non-existent product', async () => {
      const res = await request(app)
        .get('/api/products/999');

      expect(res.statusCode).toBe(404);
    });
  });

  describe('POST /api/products (admin only)', () => {
    it('should create a product successfully with admin token', async () => {
      const productData = {
        name: 'Test Product',
        description: 'This is a test product',
        price: 100.0,
        stock: 10
      };

      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(productData);

      expect(res.statusCode).toBe(201);
      expect(res.body.name).toBe('Test Product');
      expect(res.body.description).toBe('This is a test product');
      expect(res.body.price).toBe(100.0);
      expect(res.body.stock).toBe(10);
    });

    it('should return 401 without auth token', async () => {
      const productData = {
        name: 'Test Product',
        price: 100.0,
        stock: 10
      };

      const res = await request(app)
        .post('/api/products')
        .send(productData);

      expect(res.statusCode).toBe(401);
    });

    it('should return 403 with regular user token (not admin)', async () => {
      const productData = {
        name: 'Test Product',
        price: 100.0,
        stock: 10
      };

      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${userToken}`)
        .send(productData);

      expect(res.statusCode).toBe(403);
    });
  });

  describe('PUT /api/products/:id (admin only)', () => {
    it('should update a product with admin token', async () => {
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
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(res.statusCode).toBe(200);
      expect(res.body.name).toBe('Updated Product');
      expect(res.body.price).toBe(200.0);
    });

    it('should return 401 without auth token', async () => {
      const product = await Product.create({
        name: 'Test Product',
        price: 100.0,
        stock: 10
      });

      const res = await request(app)
        .put(`/api/products/${product.id}`)
        .send({ name: 'Updated' });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('DELETE /api/products/:id (admin only)', () => {
    it('should return 401 without auth token', async () => {
      const product = await Product.create({
        name: 'Test Product',
        price: 100.0,
        stock: 10
      });

      const res = await request(app)
        .delete(`/api/products/${product.id}`);

      expect(res.statusCode).toBe(401);
    });

    it('should return 403 with regular user token', async () => {
      const product = await Product.create({
        name: 'Test Product',
        price: 100.0,
        stock: 10
      });

      const res = await request(app)
        .delete(`/api/products/${product.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toBe(403);
    });
  });
});
