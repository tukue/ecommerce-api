const { Sequelize, DataTypes } = require('sequelize');
const OrderModel = require('../models/order');
const UserModel = require('../models/user');
const ProductModel = require('../models/product'); // Add ProductModel

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: ':memory:',
  logging: false
});

// Initialize models
const Order = OrderModel(sequelize, DataTypes);
const User = UserModel(sequelize, DataTypes);
const Product = ProductModel(sequelize, DataTypes); // Initialize Product model

// Set up associations
User.hasMany(Order, { foreignKey: 'userId', as: 'orders' });
Order.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Product.hasMany(Order, { foreignKey: 'productId', as: 'orders' }); // Add association for Product
Order.belongsTo(Product, { foreignKey: 'productId', as: 'product' }); // Add association for Order

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
    await Product.destroy({ where: {}, truncate: true }); // Add Product cleanup
  });

  it('should create an order successfully', async () => {
    // Create a user first
    const user = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123'
    });

    // Add a product
    const product = await Product.create({
      name: 'Test Product',
      description: 'This is a test product',
      price: 100.0,
      stock: 10
    });

    const validOrder = {
      userId: user.id,
      productId: product.id, // Add productId
      quantity: 2, // Add quantity
      total: 200.0,
      status: 'pending'
    };

    const order = await Order.create(validOrder);

    expect(order).toBeDefined();
    expect(order.userId).toBe(validOrder.userId);
    expect(order.productId).toBe(validOrder.productId);
    expect(order.quantity).toBe(validOrder.quantity);
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

    // Add a product
    const product = await Product.create({
      name: 'Test Product',
      description: 'This is a test product',
      price: 100.0,
      stock: 10
    });

    // Create an order
    const order = await Order.create({
      userId: user.id,
      productId: product.id,
      quantity: 2,
      total: 200.0,
      status: 'pending'
    });

    // Fetch order with user and product
    const fetchedOrder = await Order.findByPk(order.id, {
      include: [
        { model: User, as: 'user' },
        { model: Product, as: 'product' } // Include product
      ]
    });

    expect(fetchedOrder).toBeDefined();
    expect(fetchedOrder.user).toBeDefined();
    expect(fetchedOrder.user.id).toBe(user.id);
    expect(fetchedOrder.user.username).toBe(user.username);
    expect(fetchedOrder.product).toBeDefined();
    expect(fetchedOrder.product.id).toBe(product.id);
    expect(fetchedOrder.product.name).toBe(product.name);
  });
});
