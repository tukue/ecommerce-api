const asyncHandler = require('../utils/asyncHandler');
const OrderService = require('../services/orderService');

function service(req) {
  return new OrderService(req.models);
}

module.exports = {
  createOrder: asyncHandler(async (req, res) => {
    const order = await service(req).createOrder(req.body, req.user);
    res.status(201).json(order);
  }),

  getAllOrders: asyncHandler(async (req, res) => {
    const orders = await service(req).getAllOrders(req.user);
    res.status(200).json(orders);
  }),

  getOrderById: asyncHandler(async (req, res) => {
    const order = await service(req).getOrderById(req.params.id, req.user);
    res.status(200).json(order);
  }),

  updateOrder: asyncHandler(async (req, res) => {
    const result = await service(req).updateOrder(req.params.id, req.body, req.user);
    res.status(200).json(result);
  }),

  deleteOrder: asyncHandler(async (req, res) => {
    await service(req).deleteOrder(req.params.id, req.user);
    res.status(200).json({ message: 'Order deleted successfully' });
  }),
};
