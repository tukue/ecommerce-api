const asyncHandler = require('../utils/asyncHandler');
const { getOrderService } = require('../config/container');

module.exports = {
  createOrder: asyncHandler(async (req, res) => {
    const order = await getOrderService(req.models).createOrder(req.body, req.user);
    res.status(201).json(order);
  }),

  getAllOrders: asyncHandler(async (req, res) => {
    const orders = await getOrderService(req.models).getAllOrders(req.user);
    res.status(200).json(orders);
  }),

  getOrderById: asyncHandler(async (req, res) => {
    const order = await getOrderService(req.models).getOrderById(req.params.id, req.user);
    res.status(200).json(order);
  }),

  updateOrder: asyncHandler(async (req, res) => {
    const result = await getOrderService(req.models).updateOrder(req.params.id, req.body, req.user);
    res.status(200).json(result);
  }),

  deleteOrder: asyncHandler(async (req, res) => {
    await getOrderService(req.models).deleteOrder(req.params.id, req.user);
    res.status(200).json({ message: 'Order deleted successfully' });
  }),
};
