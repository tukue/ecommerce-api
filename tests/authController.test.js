const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const { Sequelize, DataTypes } = require('sequelize');
const UserModel = require('../models/user');
const OrderModel = require('../models/order');
const ProductModel = require('../models/product');
const authRoutes = require('../routes/authRoutes');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Mock environment variables
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '24h';

// Create test database connection
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: ':memory:',
  logging: false
});

// Initialize models
const User = UserModel(sequelize, DataTypes);
const Order = OrderModel(sequelize, DataTypes);
const Product = ProductModel(sequelize, DataTypes);

// Set up associations
User.hasMany(Order, { foreignKey: 'userId', as: 'orders' });
Order.belongsTo(User, { foreignKey: 'userId' });
Order.belongsTo(Product, { foreignKey: 'productId' });
Product.hasMany(Order, { foreignKey: 'productId', as: 'orders' });

// Setup express app
const app = express();
app.use(bodyParser.json());
app.use((req, res, next) => {
  req.models = { User, Order, Product };
  next();
});
app.use('/api/auth', authRoutes);

describe('Auth Controller', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    await User.destroy({ where: {}, truncate: true });
    await Order.destroy({ where: {}, truncate: true });
    await Product.destroy({ where: {}, truncate: true });
  });

  describe('Registration', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123'
      };

      const res = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(res.statusCode).toBe(201);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.username).toBe(userData.username);
      expect(res.body.user.email).toBe(userData.email);
      expect(res.body.user.password).toBeUndefined();
      expect(res.body.token).toBeDefined();
    });

    it('should not register a user with existing email', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      // Create first user
      await User.create(userData);

      const res = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('User with this email or username already exists');
    });
  });

  describe('Login', () => {
    it('should login a user successfully', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      // Create user (password will be hashed by model hooks)
      await User.create(userData);

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.username).toBe(userData.username);
      expect(res.body.user.email).toBe(userData.email);
      expect(res.body.user.password).toBeUndefined();
      expect(res.body.token).toBeDefined();
    });

    it('should not login with invalid credentials', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      // Create user (password will be hashed by model hooks)
      await User.create(userData);

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: 'wrongpassword'
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toBe('Invalid email or password. Please try again.');
    });
  });

  describe('Profile', () => {
    it('should get user profile with orders', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      // Create user (password will be hashed by model hooks)
      const user = await User.create(userData);

      // Add a product
      const product = await Product.create({
        name: 'Test Product',
        description: 'This is a test product',
        price: 100.0,
        stock: 10
      });

      // Create some orders
      await Order.bulkCreate([
        { userId: user.id, productId: product.id, quantity: 1, total: 100, status: 'completed' },
        { userId: user.id, productId: product.id, quantity: 2, total: 200, status: 'pending' }
      ]);

      // Generate token
      const token = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
      );

      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.username).toBe(userData.username);
      expect(res.body.user.email).toBe(userData.email);
      expect(res.body.user.password).toBeUndefined();
      expect(res.body.user.orders).toHaveLength(2);
    });
  });

  describe('Password Reset', () => {
    it('should generate a password reset token', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      // Create user (password will be hashed by model hooks)
      await User.create(userData);

      const res = await request(app)
        .post('/api/auth/request-reset')
        .send({ email: userData.email });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Password reset token generated');
      expect(res.body.resetToken).toBeDefined();
    });

    it('should reset password with valid token', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      // Create user (password will be hashed by model hooks)
      const user = await User.create(userData);

      // Generate reset token
      const resetToken = 'validtoken123';
      const hashedToken = await bcrypt.hash(resetToken, 12);
      await user.update({
        resetToken: hashedToken,
        resetTokenExpiry: new Date(Date.now() + 3600000)
      });

      const res = await request(app)
        .post('/api/auth/reset')
        .send({
          token: resetToken,
          newPassword: 'newpassword123'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Password reset successful');

      // Verify new password works
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: 'newpassword123'
        });

      expect(loginRes.statusCode).toBe(200);
    });
  });
});