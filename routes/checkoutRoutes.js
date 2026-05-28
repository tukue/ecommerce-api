const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/authMiddleWare');
const { Op } = require('sequelize');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const parseQuantity = (quantity) => {
  const parsedQuantity = Number(quantity);
  return Number.isInteger(parsedQuantity) && parsedQuantity > 0 ? parsedQuantity : null;
};

const checkoutController = {
  createCheckoutSession: async (req, res) => {
    try {
      const { cart } = req.body;

      if (!cart || !Array.isArray(cart) || cart.length === 0) {
        return res.status(400).json({ error: 'Cart is required and must be a non-empty array' });
      }

      const productIds = cart.map(item => item.productId || item.id);
      if (productIds.some(productId => !productId)) {
        return res.status(400).json({ error: 'Each cart item must include a productId' });
      }

      const products = await req.models.Product.findAll({
        where: { id: { [Op.in]: productIds } }
      });
      const productMap = new Map(products.map(product => [String(product.id), product]));

      const lineItems = cart.map(item => {
        const productId = String(item.productId || item.id);
        const product = productMap.get(productId);
        if (!product) {
          throw new Error(`Product ${productId} not found`);
        }

        const quantity = parseQuantity(item.quantity);
        if (!quantity) {
          throw new Error('Each cart item must include a positive integer quantity');
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
          userId: req.user.id.toString()
        }
      });

      res.json({ id: session.id });
    } catch (error) {
      console.error('Error creating checkout session:', error);
      res.status(500).json({ error: error.message });
    }
  }
};

router.post('/create-checkout-session', authMiddleware, checkoutController.createCheckoutSession);

module.exports = router;
