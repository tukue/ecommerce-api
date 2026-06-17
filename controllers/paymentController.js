const asyncHandler = require('../utils/asyncHandler');
const { getPaymentService } = require('../config/container');

module.exports = {
  createPayment: asyncHandler(async (req, res) => {
    const payment = await getPaymentService(req.models).createPayment(req.body, req.user);
    res.status(201).json(payment);
  }),

  getAllPayments: asyncHandler(async (req, res) => {
    const payments = await getPaymentService(req.models).getAllPayments(req.user);
    res.status(200).json(payments);
  }),

  getPaymentById: asyncHandler(async (req, res) => {
    const payment = await getPaymentService(req.models).getPaymentById(req.params.id, req.user);
    res.status(200).json(payment);
  }),
};
