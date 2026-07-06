const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/authMiddleWare');
const validate = require('../middleware/validate');
const { createCheckoutSession } = require('../utils/validators');
const asyncHandler = require('../utils/asyncHandler');
const CheckoutService = require('../services/checkoutService');

const checkoutController = {
  createCheckoutSession: asyncHandler(async (req, res) => {
    const service = new CheckoutService(req.models);
    const result = await service.createCheckoutSession(req.body.cart, req.user);
    res.json(result);
  }),
};

router.post(
  '/create-checkout-session',
  authMiddleware,
  validate({ body: createCheckoutSession }),
  checkoutController.createCheckoutSession,
);

module.exports = router;
