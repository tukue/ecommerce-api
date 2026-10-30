const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { trace } = require('@opentelemetry/api');

router.post('/create-checkout-session', async (req, res) => {
  const tracer = trace.getTracer('checkout-service');
  
  const span = tracer.startSpan('create_checkout_session');
  span.setAttribute('cart.items_count', req.body.cart.length);
  
  try {
    const { cart } = req.body;
    
    await tracer.startActiveSpan('prepare_line_items', async (lineItemsSpan) => {
      const lineItems = cart.map(item => {
        const unitAmount = Math.round(item.price * 100);
        lineItemsSpan.setAttribute('cart.total_amount', unitAmount * item.quantity);
        return {
          price_data: {
            currency: 'usd',
            product_data: { name: item.name },
            unit_amount: unitAmount,
          },
          quantity: item.quantity,
        };
      });
      lineItemsSpan.end();
      
      await tracer.startActiveSpan('stripe_session_create', async (stripeSpan) => {
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: lineItems,
          mode: 'payment',
          success_url: 'http://localhost:5004/success',
          cancel_url: 'http://localhost:5004/cancel',
        });
        stripeSpan.setAttribute('stripe.session.id', session.id);
        stripeSpan.end();
        
        res.json({ id: session.id });
      });
    });
  } catch (error) {
    span.recordException(error);
    span.setStatus({ code: opentelemetry.SpanStatusCode.ERROR });
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: error.message });
  } finally {
    span.end();
  }
});

module.exports = router;
