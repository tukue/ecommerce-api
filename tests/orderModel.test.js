const { Sequelize, DataTypes } = require('sequelize');
const OrderModel = require('../models/order');
const UserModel = require('../models/user');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: ':memory:',
  logging: false
});

// Initialize models
const Order = OrderModel(sequelize, DataTypes);
const User = UserModel(sequelize, DataTypes);

// Set up associations
User.hasMany(Order, { foreignKey: 'userId', as: 'orders' });
Order.belongsTo(User, { foreignKey: 'userId', as: 'user' });

describe('Order Model', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    await Order.destroy({ where: {}, truncate: true });
    await User.destroy({ where: {}, truncate: true });
  });

  it('should create an order successfully', async () => {
    // Create a user first
    const user = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123'
    });

    const validOrder = {
      userId: user.id,
      total: 200.0,
      status: 'pending'
    };

    const order = await Order.create(validOrder);
    
    expect(order).toBeDefined();
    expect(order.userId).toBe(validOrder.userId);
    expect(order.total).toBe(validOrder.total);
    expect(order.status).toBe(validOrder.status);
  });

  it('should not create an order without required fields', async () => {
    const invalidOrder = {
      userId: 1
    };

    await expect(Order.create(invalidOrder)).rejects.toThrow();
  });

  it('should not create an order with negative total', async () => {
    // Create a user first
    const user = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123'
    });

    const invalidOrder = {
      userId: user.id,
      total: -100,
      status: 'pending'
    };

    await expect(Order.create(invalidOrder)).rejects.toThrow();
  });

  it('should not create an order with invalid status', async () => {
    // Create a user first
    const user = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123'
    });

    const invalidOrder = {
      userId: user.id,
      total: 100,
      status: 'invalid'
    };

    await expect(Order.create(invalidOrder)).rejects.toThrow();
  });

  it('should fetch order with associated user', async () => {
    // Create a user first
    const user = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123'
    });

    // Create an order
    const order = await Order.create({
      userId: user.id,
      total: 200.0,
      status: 'pending'
    });

    // Fetch order with user
    const fetchedOrder = await Order.findByPk(order.id, {
      include: [{ model: User, as: 'user' }]
    });

    expect(fetchedOrder).toBeDefined();
    expect(fetchedOrder.user).toBeDefined();
    expect(fetchedOrder.user.id).toBe(user.id);
    expect(fetchedOrder.user.username).toBe(user.username);
  });
});
