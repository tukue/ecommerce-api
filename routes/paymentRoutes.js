const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/authMiddleWare');

const createPaymentWithAuth = async (req, res) => {
  try {
    const { orderId, stripePaymentId, amount, currency, status } = req.body;

    if (!orderId || !amount || !currency) {
      return res
        .status(400)
        .json({ error: 'Missing required fields: orderId, amount, or currency' });
    }

    const order = await req.models.Order.findByPk(orderId);
    if (!order) {
      return res.status(404).json({ error: `Order with ID ${orderId} not found` });
    }

    if (req.user.role !== 'admin' && order.userId !== req.user.id) {
      return res.status(403).json({ message: 'Access denied: This is not your order' });
    }

    const payment = await req.models.Payment.create({
      userId: req.user.id,
      orderId,
      stripePaymentId,
      amount,
      currency,
      status: status || 'pending',
    });

    return res.status(201).json(payment);
  } catch (error) {
    console.error('Error creating payment:', error);
    return res.status(500).json({ error: error.message });
  }
};

const getAllPaymentsWithAuth = async (req, res) => {
  try {
    let whereClause = {};

    if (req.user.role !== 'admin') {
      whereClause = { userId: req.user.id };
    }

    const payments = await req.models.Payment.findAll({
      where: whereClause,
      include: [
        {
          model: req.models.Order,
          as: 'order',
        },
      ],
    });
    return res.status(200).json(payments);
  } catch (error) {
    console.error('Error getting payments:', error);
    return res.status(500).json({ error: error.message });
  }
};

const getPaymentByIdWithAuth = async (req, res) => {
  try {
    const payment = await req.models.Payment.findByPk(req.params.id, {
      include: [
        {
          model: req.models.Order,
          as: 'order',
        },
      ],
    });
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (req.user.role !== 'admin' && payment.userId !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    return res.status(200).json(payment);
  } catch (error) {
    console.error('Error getting payment:', error);
    return res.status(500).json({ error: error.message });
  }
};

router.post('/', authMiddleware, createPaymentWithAuth);
router.get('/', authMiddleware, getAllPaymentsWithAuth);
router.get('/:id', authMiddleware, getPaymentByIdWithAuth);

module.exports = router;
