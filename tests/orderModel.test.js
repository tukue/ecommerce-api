const { Sequelize, DataTypes } = require('sequelize');
const OrderModel = require('../models/order');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: ':memory:',
  logging: false
});

// Initialize the Order model
const Order = OrderModel(sequelize, DataTypes);

describe('Order Model', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    await Order.destroy({ where: {}, truncate: true });
  });

  it('should create an order successfully', async () => {
    const validOrder = {
      userId: 1,
      productId: 1,
      quantity: 2,
      totalPrice: 200.0
    };

    const order = await Order.create(validOrder);
    
    expect(order).toBeDefined();
    expect(order.userId).toBe(validOrder.userId);
    expect(order.productId).toBe(validOrder.productId);
    expect(order.quantity).toBe(validOrder.quantity);
    expect(order.totalPrice).toBe(validOrder.totalPrice);
  });

  it('should not create an order without required fields', async () => {
    const invalidOrder = {
      userId: 1
    };

    await expect(Order.create(invalidOrder)).rejects.toThrow();
  });

  it('should not create an order with negative quantity', async () => {
    const invalidOrder = {
      userId: 1,
      productId: 1,
      quantity: -2,
      totalPrice: 200.0
    };

    await expect(Order.create(invalidOrder)).rejects.toThrow();
  });

  it('should not create an order with negative total price', async () => {
    const invalidOrder = {
      userId: 1,
      productId: 1,
      quantity: 2,
      totalPrice: -200.0
    };

    await expect(Order.create(invalidOrder)).rejects.toThrow();
  });

  it('should not create an order with non-integer quantity', async () => {
    const invalidOrder = {
      userId: 1,
      productId: 1,
      quantity: 2.5,
      totalPrice: 200.0
    };

    await expect(Order.create(invalidOrder)).rejects.toThrow();
  });

  it('should not create an order with non-integer userId', async () => {
    const invalidOrder = {
      userId: 1.5,
      productId: 1,
      quantity: 2,
      totalPrice: 200.0
    };

    await expect(Order.create(invalidOrder)).rejects.toThrow();
  });

  it('should not create an order with non-integer productId', async () => {
    const invalidOrder = {
      userId: 1,
      productId: 1.5,
      quantity: 2,
      totalPrice: 200.0
    };

    await expect(Order.create(invalidOrder)).rejects.toThrow();
  });
});
