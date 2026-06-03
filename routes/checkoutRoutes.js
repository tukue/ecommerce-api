const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/authMiddleWare');
const validate = require('../middleware/validate');
const { createCheckoutSession } = require('../utils/validators');
const { Op } = require('sequelize');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const asyncHandler = require('../utils/asyncHandler');
const HttpError = require('../utils/httpError');

const parseQuantity = (quantity) => {
  const parsedQuantity = Number(quantity);
  return Number.isInteger(parsedQuantity) && parsedQuantity > 0 ? parsedQuantity : null;
};

const checkoutController = {
  createCheckoutSession: asyncHandler(async (req, res) => {
    const { cart } = req.body;

    if (!cart || !Array.isArray(cart) || cart.length === 0) {
      throw new HttpError(400, 'Cart is required and must be a non-empty array', 'ValidationError');
    }

    const productIds = cart.map((item) => item.productId || item.id);
    if (productIds.some((productId) => !productId)) {
      throw new HttpError(400, 'Each cart item must include a productId', 'ValidationError');
    }

    const products = await req.models.Product.findAll({
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
          product_data: {
            name: product.name,
          },
          unit_amount: unitAmount,
        },
        quantity,
      };
    });

    const successUrl = process.env.STRIPE_SUCCESS_URL || 'http://localhost:5004/success';
    const cancelUrl = process.env.STRIPE_CANCEL_URL || 'http://localhost:5004/cancel';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId: req.user.id.toString(),
      },
    });

    res.json({ id: session.id });
  }),
};

router.post(
  '/create-checkout-session',
  authMiddleware,
  validate({ body: createCheckoutSession }),
  checkoutController.createCheckoutSession,
);

module.exports = router;
