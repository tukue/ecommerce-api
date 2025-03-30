const { Sequelize, DataTypes } = require('sequelize');
const UserModel = require('../models/user');
const OrderModel = require('../models/order');
const PaymentModel = require('../models/payment');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: ':memory:',
  logging: false,
});

// Initialize models
const User = UserModel(sequelize, DataTypes);
const Order = OrderModel(sequelize, DataTypes);
const Payment = PaymentModel(sequelize, DataTypes);

// Set up associations
User.hasMany(Order, { foreignKey: 'userId', as: 'orders' });
Order.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Order.hasOne(Payment, { foreignKey: 'orderId', as: 'payment' });
Payment.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });
Payment.belongsTo(User, { foreignKey: 'userId', as: 'user' });

describe('Payment Model', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  afterEach(async () => {
    await Payment.destroy({ where: {}, truncate: true });
    await Order.destroy({ where: {}, truncate: true });
    await User.destroy({ where: {}, truncate: true });
  });

  it('should create a payment and associate it with a user and order', async () => {
    const user = await User.create({ username: 'testuser', email: 'test@example.com', password: 'password123' });
    const order = await Order.create({
      userId: user.id,
      productId: 1,
      quantity: 2,
      total: 200,
      status: 'pending', // Add the required status field
    });

    const payment = await Payment.create({
      userId: user.id,
      orderId: order.id,
      stripePaymentId: 'pi_123456789',
      amount: 200,
      currency: 'usd',
      status: 'succeeded',
    });

    expect(payment).toBeDefined();
    expect(payment.userId).toBe(user.id);
    expect(payment.orderId).toBe(order.id);
    expect(payment.amount).toBe(200);
    expect(payment.currency).toBe('usd');
    expect(payment.status).toBe('succeeded');
  });

  it('should not create a payment without required fields', async () => {
    await expect(
      Payment.create({
        stripePaymentId: 'pi_123456789',
        amount: 200,
        currency: 'usd',
        status: 'succeeded',
      })
    ).rejects.toThrow();
  });

  it('should fetch a payment with associated user and order', async () => {
    const user = await User.create({ username: 'testuser', email: 'test@example.com', password: 'password123' });
    const order = await Order.create({
      userId: user.id,
      productId: 1,
      quantity: 2,
      total: 200,
      status: 'pending', // Add the required status field
    });

    const payment = await Payment.create({
      userId: user.id,
      orderId: order.id,
      stripePaymentId: 'pi_123456789',
      amount: 200,
      currency: 'usd',
      status: 'succeeded',
    });

    const fetchedPayment = await Payment.findByPk(payment.id, {
      include: [
        { model: User, as: 'user' },
        { model: Order, as: 'order' },
      ],
    });

    expect(fetchedPayment).toBeDefined();
    expect(fetchedPayment.user).toBeDefined();
    expect(fetchedPayment.user.id).toBe(user.id);
    expect(fetchedPayment.order).toBeDefined();
    expect(fetchedPayment.order.id).toBe(order.id);
  });
});