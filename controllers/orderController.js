const Order = require('../models/order');

const orderController = {
  // Create a new order
  createOrder: async (req, res) => {
    try {
      const { userId, productId, quantity, totalPrice } = req.body;
      const order = await Order.create({ userId, productId, quantity, totalPrice });
      res.status(201).json(order);
    } catch (error) {
      console.error('Error creating order:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // Get all orders
  getAllOrders: async (req, res) => {
    try {
      const orders = await Order.findAll();
      res.status(200).json(orders);
    } catch (error) {
      console.error('Error getting orders:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // Get order by ID
  getOrderById: async (req, res) => {
    try {
      const order = await Order.findByPk(req.params.id);
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }
      res.status(200).json(order);
    } catch (error) {
      console.error('Error getting order by ID:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // Update order by ID
  updateOrder: async (req, res) => {
    try {
      const updatedOrder = await Order.update(req.body, {
        where: { id: req.params.id },
        returning: true,
      });
      if (!updatedOrder[0]) {
        return res.status(404).json({ message: 'Order not found' });
      }
      res.status(200).json(updatedOrder[1][0]);
    } catch (error) {
      console.error('Error updating order:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // Delete order by ID
  deleteOrder: async (req, res) => {
    try {
      const deletedOrder = await Order.destroy({
        where: { id: req.params.id },
      });
      if (!deletedOrder) {
        return res.status(404).json({ message: 'Order not found' });
      }
      res.status(200).json({ message: 'Order deleted successfully' });
    } catch (error) {
      console.error('Error deleting order:', error);
      res.status(500).json({ error: error.message });
    }
  },
};

module.exports = orderController;