const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

router.post('/create-checkout-session', async (req, res) => {
  const { cart } = req.body;

  const lineItems = cart.map(item => {
    const unitAmount = Math.round(item.price * 100); // Convert price to cents
    console.log(`Item: ${item.name}, Price: ${item.price}, Unit Amount: ${unitAmount}`);
    
    if (isNaN(unitAmount)) {
      console.error(`Invalid unit amount for item: ${item.name}`);
      return res.status(400).json({ error: `Invalid unit amount for item: ${item.name}` });
    }

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

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: 'http://localhost:5004/success',
      cancel_url: 'http://localhost:5004/cancel',
    });

    res.json({ id: session.id });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;