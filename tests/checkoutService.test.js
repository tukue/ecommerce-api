const mockStripeSessionCreate = jest.fn();

jest.mock('stripe', () => () => ({
  checkout: {
    sessions: { create: mockStripeSessionCreate },
  },
}));

process.env.STRIPE_SECRET_KEY = 'sk_test_mock';
process.env.STRIPE_SUCCESS_URL = 'http://localhost:5004/success';
process.env.STRIPE_CANCEL_URL = 'http://localhost:5004/cancel';

const CheckoutService = require('../services/checkoutService');
const HttpError = require('../utils/httpError');

describe('CheckoutService', () => {
  let service;
  let models;

  beforeEach(() => {
    jest.clearAllMocks();
    models = {
      Product: {
        findAll: jest.fn(),
      },
    };
    service = new CheckoutService(models);
  });

  describe('createCheckoutSession', () => {
    const user = { id: 1, role: 'user' };

    it('throws 400 when cart is empty array', async () => {
      await expect(service.createCheckoutSession([], user)).rejects.toThrow(HttpError);
      await expect(service.createCheckoutSession([], user)).rejects.toMatchObject({
        statusCode: 400,
      });
    });

    it('throws 400 when cart is not an array', async () => {
      await expect(service.createCheckoutSession(null, user)).rejects.toMatchObject({
        statusCode: 400,
      });
      await expect(service.createCheckoutSession('invalid', user)).rejects.toMatchObject({
        statusCode: 400,
      });
    });

    it('throws 400 when cart items lack productId', async () => {
      const cart = [{ quantity: 1 }];
      await expect(service.createCheckoutSession(cart, user)).rejects.toMatchObject({
        statusCode: 400,
        message: 'Each cart item must include a productId',
      });
    });

    it('throws 404 when a product is not found', async () => {
      models.Product.findAll.mockResolvedValue([]);
      const cart = [{ productId: 999, quantity: 1 }];

      await expect(service.createCheckoutSession(cart, user)).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it('creates stripe session with correct line items', async () => {
      const products = [
        { id: 10, name: 'Widget', price: 25.5 },
        { id: 11, name: 'Gadget', price: 10.0 },
      ];
      models.Product.findAll.mockResolvedValue(products);
      mockStripeSessionCreate.mockResolvedValue({ id: 'cs_test_abc' });

      const cart = [
        { productId: 10, quantity: 2 },
        { productId: 11, quantity: 1 },
      ];

      const result = await service.createCheckoutSession(cart, user);

      expect(result).toEqual({ id: 'cs_test_abc' });
      expect(mockStripeSessionCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_method_types: ['card'],
          mode: 'payment',
          line_items: [
            expect.objectContaining({
              price_data: expect.objectContaining({
                product_data: { name: 'Widget' },
                unit_amount: 2550,
              }),
              quantity: 2,
            }),
            expect.objectContaining({
              price_data: expect.objectContaining({
                product_data: { name: 'Gadget' },
                unit_amount: 1000,
              }),
              quantity: 1,
            }),
          ],
          metadata: { userId: '1' },
        }),
      );
    });

    it('throws 502 when stripe call fails', async () => {
      models.Product.findAll.mockResolvedValue([{ id: 10, name: 'Widget', price: 25.5 }]);
      mockStripeSessionCreate.mockRejectedValue(new Error('Stripe timeout'));

      const cart = [{ productId: 10, quantity: 1 }];

      await expect(service.createCheckoutSession(cart, user)).rejects.toMatchObject({
        statusCode: 502,
        message: 'Payment service error',
      });
    });

    it('accepts cart items with `id` field instead of `productId`', async () => {
      models.Product.findAll.mockResolvedValue([{ id: 10, name: 'Widget', price: 25.5 }]);
      mockStripeSessionCreate.mockResolvedValue({ id: 'cs_test_def' });

      const cart = [{ id: 10, quantity: 3 }];
      const result = await service.createCheckoutSession(cart, user);

      expect(result).toEqual({ id: 'cs_test_def' });
    });
  });
});
