const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const HttpError = require('../utils/httpError');
const { Op } = require('sequelize');
const { orderTotal, stripeRequestTotal } = require('../config/metrics');

const parseQuantity = (quantity) => {
  const parsedQuantity = Number(quantity);
  return Number.isInteger(parsedQuantity) && parsedQuantity > 0 ? parsedQuantity : null;
};

class CheckoutService {
  constructor(models) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY environment variable is required');
    }
    this.models = models;
  }

  async createCheckoutSession(cart, user) {
    if (!cart || !Array.isArray(cart) || cart.length === 0) {
      throw new HttpError(400, 'Cart is required and must be a non-empty array', 'ValidationError');
    }

    const productIds = cart.map((item) => item.productId || item.id);
    if (productIds.some((productId) => !productId)) {
      throw new HttpError(400, 'Each cart item must include a productId', 'ValidationError');
    }

    const products = await this.models.Product.findAll({
      where: { id: { [Op.in]: productIds } },
    });
    const productMap = new Map(products.map((product) => [String(product.id), product]));

    const lineItems = cart.map((item) => {
      const productId = String(item.productId || item.id);
      const product = productMap.get(productId);
      if (!product) {
        throw new HttpError(404, `Product ${productId} not found`, 'NotFoundError');
      }

      const quantity = parseQuantity(item.quantity);
      if (!quantity) {
        throw new HttpError(
          400,
          'Each cart item must include a positive integer quantity',
          'ValidationError',
        );
      }

      const unitAmount = Math.round(Number(product.price) * 100);
      return {
        price_data: {
          currency: 'usd',
          product_data: { name: product.name },
          unit_amount: unitAmount,
        },
        quantity,
      };
    });

    const successUrl = process.env.STRIPE_SUCCESS_URL || 'http://localhost:5004/success';
    const cancelUrl = process.env.STRIPE_CANCEL_URL || 'http://localhost:5004/cancel';

    let session;
    try {
      session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: { userId: user.id.toString() },
      });
      stripeRequestTotal.inc({ operation: 'create_checkout_session', status: 'success' });
    } catch (error) {
      stripeRequestTotal.inc({ operation: 'create_checkout_session', status: 'error' });
      console.error('Stripe checkout session creation failed:', error.message);
      throw new HttpError(502, 'Payment service error', 'PaymentGatewayError');
    }

    orderTotal.inc();
    return { id: session.id };
  }
}

module.exports = CheckoutService;
