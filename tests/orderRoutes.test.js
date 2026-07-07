const request = require('supertest');
const express = require('express');
const { Sequelize, DataTypes } = require('sequelize');
const jwt = require('jsonwebtoken');
const OrderModel = require('../models/order');
const UserModel = require('../models/user');
const ProductModel = require('../models/product');
const PaymentModel = require('../models/payment');
const orderRoutes = require('../routes/orderRoutes');
const { errorHandler } = require('../middleware/errorHandler');

process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '24h';

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: ':memory:',
  logging: false,
});

const Order = OrderModel(sequelize, DataTypes);
const User = UserModel(sequelize, DataTypes);
const Product = ProductModel(sequelize, DataTypes);
const Payment = PaymentModel(sequelize, DataTypes);

User.hasMany(Order, { foreignKey: 'userId', as: 'orders' });
User.hasMany(Payment, { foreignKey: 'userId', as: 'payments' });
Product.hasMany(Order, { foreignKey: 'productId', as: 'orders' });
Order.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Order.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
Order.hasOne(Payment, { foreignKey: 'orderId', as: 'payment' });
Payment.belongsTo(User, { foreignKey: 'userId' });
Payment.belongsTo(Order, { foreignKey: 'orderId' });

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  req.models = { Order, User, Product, Payment };
  next();
});

app.use('/api', orderRoutes);
app.use(errorHandler);

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
};

describe('Order Routes', () => {
  let adminUser, regularUser1, regularUser2;
  let adminToken, userToken1, userToken2;
  let testProduct;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    await Order.destroy({ where: {}, truncate: true });
    await User.destroy({ where: {}, truncate: true });
    await Product.destroy({ where: {}, truncate: true });
    await Payment.destroy({ where: {}, truncate: true });

    adminUser = await User.create({
      username: 'admin',
      email: 'admin@example.com',
      password: 'Password123',
      role: 'admin',
    });
    adminToken = generateToken(adminUser.id);

    regularUser1 = await User.create({
      username: 'user1',
      email: 'user1@example.com',
      password: 'Password123',
      role: 'user',
    });
    userToken1 = generateToken(regularUser1.id);

    regularUser2 = await User.create({
      username: 'user2',
      email: 'user2@example.com',
      password: 'Password123',
      role: 'user',
    });
    userToken2 = generateToken(regularUser2.id);

    testProduct = await Product.create({
      name: 'Test Product',
      description: 'A test product',
      price: 50.0,
      stock: 100,
    });
  });

  describe('Authentication', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app).get('/api/orders');

      expect(res.statusCode).toBe(401);
    });

    it('should return 401 with invalid token', async () => {
      const res = await request(app)
        .get('/api/orders')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.statusCode).toBe(401);
    });
  });

  describe('POST /api/orders (create)', () => {
    it('should create an order successfully with valid token', async () => {
      const orderData = {
        productId: testProduct.id,
        quantity: 2,
        total: 1.0,
      };

      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken1}`)
        .send(orderData);

      expect(res.statusCode).toBe(201);
      expect(res.body.userId).toBe(regularUser1.id);
      expect(res.body.productId).toBe(testProduct.id);
      expect(res.body.quantity).toBe(2);
      expect(res.body.total).toBe(100.0);
      expect(res.body.status).toBe('pending');
    });

    it('should ignore client-supplied totals and calculate total from product price', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken1}`)
        .send({
          productId: testProduct.id,
          quantity: 3,
          total: 0.01,
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.total).toBe(150.0);
    });

    it('should return 400 with missing fields', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken1}`)
        .send({ productId: testProduct.id });

      expect(res.statusCode).toBe(400);
    });

    it('should return 404 for non-existent product', async () => {
      const orderData = {
        productId: 9999,
        quantity: 2,
        total: 100.0,
      };

      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken1}`)
        .send(orderData);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('GET /api/orders (list)', () => {
    beforeEach(async () => {
      await Order.create({
        userId: regularUser1.id,
        productId: testProduct.id,
        quantity: 1,
        total: 50.0,
        status: 'pending',
      });
      await Order.create({
        userId: regularUser2.id,
        productId: testProduct.id,
        quantity: 3,
        total: 150.0,
        status: 'completed',
      });
    });

    it('regular user should only see their own orders', async () => {
      const res = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${userToken1}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0].userId).toBe(regularUser1.id);
    });

    it('admin should see all orders', async () => {
      const res = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
    });
  });

  describe('GET /api/orders/:id (single)', () => {
    let user1Order, user2Order;

    beforeEach(async () => {
      user1Order = await Order.create({
        userId: regularUser1.id,
        productId: testProduct.id,
        quantity: 1,
        total: 50.0,
        status: 'pending',
      });
      user2Order = await Order.create({
        userId: regularUser2.id,
        productId: testProduct.id,
        quantity: 3,
        total: 150.0,
        status: 'completed',
      });
    });

    it('user can access their own order', async () => {
      const res = await request(app)
        .get(`/api/orders/${user1Order.id}`)
        .set('Authorization', `Bearer ${userToken1}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.id).toBe(user1Order.id);
    });

    it("user cannot access another user's order", async () => {
      const res = await request(app)
        .get(`/api/orders/${user2Order.id}`)
        .set('Authorization', `Bearer ${userToken1}`);

      expect(res.statusCode).toBe(403);
    });

    it('admin can access any order', async () => {
      const res = await request(app)
        .get(`/api/orders/${user2Order.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.id).toBe(user2Order.id);
    });

    it('returns 404 for non-existent order', async () => {
      const res = await request(app)
        .get('/api/orders/9999')
        .set('Authorization', `Bearer ${userToken1}`);

      expect(res.statusCode).toBe(404);
    });

    it('returns 400 for invalid order id', async () => {
      const res = await request(app)
        .get('/api/orders/not-a-number')
        .set('Authorization', `Bearer ${userToken1}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('ValidationError');
    });
  });

  describe('PUT /api/orders/:id (update)', () => {
    let user1Order;

    beforeEach(async () => {
      user1Order = await Order.create({
        userId: regularUser1.id,
        productId: testProduct.id,
        quantity: 1,
        total: 50.0,
        status: 'pending',
      });
    });

    it('user can update their own order quantity and total is recalculated', async () => {
      const res = await request(app)
        .put(`/api/orders/${user1Order.id}`)
        .set('Authorization', `Bearer ${userToken1}`)
        .send({ quantity: 5, total: 1.0 });

      expect(res.statusCode).toBe(200);
      expect(res.body.order.quantity).toBe(5);
      expect(res.body.order.total).toBe(250.0);
    });

    it('regular user cannot update order status (only admin can)', async () => {
      const res = await request(app)
        .put(`/api/orders/${user1Order.id}`)
        .set('Authorization', `Bearer ${userToken1}`)
        .send({ status: 'completed' });

      expect(res.statusCode).toBe(200);
      expect(res.body.order.status).toBe('pending');
    });

    it('admin can update order status', async () => {
      const res = await request(app)
        .put(`/api/orders/${user1Order.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'shipped' });

      expect(res.statusCode).toBe(200);
      expect(res.body.order.status).toBe('shipped');
    });

    it("user cannot update another user's order", async () => {
      const res = await request(app)
        .put(`/api/orders/${user1Order.id}`)
        .set('Authorization', `Bearer ${userToken2}`)
        .send({ quantity: 10 });

      expect(res.statusCode).toBe(403);
    });

    it('returns 400 when updating an invalid order id', async () => {
      const res = await request(app)
        .put('/api/orders/not-a-number')
        .set('Authorization', `Bearer ${userToken1}`)
        .send({ quantity: 10 });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('ValidationError');
    });
  });

  describe('DELETE /api/orders/:id (delete)', () => {
    let user1Order;

    beforeEach(async () => {
      user1Order = await Order.create({
        userId: regularUser1.id,
        productId: testProduct.id,
        quantity: 1,
        total: 50.0,
        status: 'pending',
      });
    });

    it('user can delete their own order', async () => {
      const res = await request(app)
        .delete(`/api/orders/${user1Order.id}`)
        .set('Authorization', `Bearer ${userToken1}`);

      expect(res.statusCode).toBe(200);
    });

    it("user cannot delete another user's order", async () => {
      const res = await request(app)
        .delete(`/api/orders/${user1Order.id}`)
        .set('Authorization', `Bearer ${userToken2}`);

      expect(res.statusCode).toBe(403);
    });

    it('admin can delete any order', async () => {
      const res = await request(app)
        .delete(`/api/orders/${user1Order.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
    });

    it('returns 400 when deleting an invalid order id', async () => {
      const res = await request(app)
        .delete('/api/orders/not-a-number')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('ValidationError');
    });
  });
});
