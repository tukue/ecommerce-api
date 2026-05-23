const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/authMiddleWare');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const checkoutController = {
  createCheckoutSession: async (req, res) => {
    try {
      const { cart } = req.body;

      if (!cart || !Array.isArray(cart) || cart.length === 0) {
        return res.status(400).json({ error: 'Cart is required and must be a non-empty array' });
      }

      const lineItems = cart.map(item => {
        if (!item.name || item.price === undefined || !item.quantity) {
          throw new Error('Each cart item must have name, price, and quantity');
        }
        
        const unitAmount = Math.round(item.price * 100);
        return {
          price_data: {
            currency: 'usd',
            product_data: {
              name: item.name,
            },
            unit_amount: unitAmount,
          },
          quantity: item.quantity,
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
