const asyncHandler = require('../utils/asyncHandler');
const PaymentService = require('../services/paymentService');

function service(req) {
  return new PaymentService(req.models);
}

module.exports = {
  createPayment: asyncHandler(async (req, res) => {
    const payment = await service(req).createPayment(req.body, req.user);
    res.status(201).json(payment);
  }),

  getAllPayments: asyncHandler(async (req, res) => {
    const payments = await service(req).getAllPayments(req.user);
    res.status(200).json(payments);
  }),

  getPaymentById: asyncHandler(async (req, res) => {
    const payment = await service(req).getPaymentById(req.params.id, req.user);
    res.status(200).json(payment);
  }),
};
