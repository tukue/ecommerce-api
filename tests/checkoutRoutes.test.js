const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

const mockStripeSessionCreate = jest.fn();

jest.mock('stripe', () => () => ({
  checkout: {
    sessions: {
      create: mockStripeSessionCreate,
    },
  },
}));

process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '24h';

const checkoutRoutes = require('../routes/checkoutRoutes');
const { errorHandler } = require('../middleware/errorHandler');

const app = express();
app.use(express.json());

const user = { id: 1, role: 'user' };
const products = [{ id: 10, name: 'Server Product', price: 25.5 }];

app.use((req, res, next) => {
  req.models = {
    User: {
      findByPk: jest.fn().mockResolvedValue(user),
    },
    Product: {
      findAll: jest.fn().mockResolvedValue(products),
    },
  };
  next();
});

app.use('/api/checkout', checkoutRoutes);
app.use(errorHandler);

const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
  expiresIn: process.env.JWT_EXPIRES_IN,
});

describe('Checkout Routes', () => {
  beforeEach(() => {
    mockStripeSessionCreate.mockResolvedValue({ id: 'cs_test_123' });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('creates Stripe line items from database product values', async () => {
    const res = await request(app)
      .post('/api/checkout/create-checkout-session')
      .set('Authorization', `Bearer ${token}`)
      .send({
        cart: [
          {
            productId: 10,
            name: 'Client Controlled Name',
            price: 0.01,
            quantity: 2,
          },
        ],
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.id).toBe('cs_test_123');
    expect(mockStripeSessionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [
          expect.objectContaining({
            price_data: expect.objectContaining({
              product_data: { name: 'Server Product' },
              unit_amount: 2550,
            }),
            quantity: 2,
          }),
        ],
      }),
    );
  });
});
