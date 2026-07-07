const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const paymentRoutes = require('../routes/paymentRoutes');
const { errorHandler } = require('../middleware/errorHandler');

process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '24h';

const app = express();
app.use(express.json());

const mockUser = { id: 1, role: 'user' };
const models = {
  User: {
    findByPk: jest.fn(),
  },
  Payment: {
    findByPk: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
  },
  Order: {
    findByPk: jest.fn(),
  },
};

app.use((req, res, next) => {
  req.models = models;
  next();
});

app.use('/api/payments', paymentRoutes);
app.use(errorHandler);

const token = jwt.sign({ userId: mockUser.id }, process.env.JWT_SECRET, {
  expiresIn: process.env.JWT_EXPIRES_IN,
});

describe('Payment Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    models.User.findByPk.mockResolvedValue(mockUser);
  });

  it('returns 400 when payment id is not a positive integer', async () => {
    const res = await request(app)
      .get('/api/payments/not-a-number')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('ValidationError');
    expect(models.Payment.findByPk).not.toHaveBeenCalled();
  });
});
