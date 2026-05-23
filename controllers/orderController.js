// controllers/orderController.js

const orderController = {
  createOrder: async (req, res) => {
    try {
      const { userId, productId, quantity, totalPrice } = req.body;

      // Validate required fields
      if (!userId || !productId || !quantity || !totalPrice) {
        return res.status(400).json({
          error: 'Missing required fields: userId, productId, quantity, or totalPrice'
        });
      }

      // Check if user exists
      const user = await req.models.User.findByPk(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Check if product exists
      const product = await req.models.Product.findByPk(productId);
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      const order = await req.models.Order.create({
        userId,
        productId,
        quantity,
        totalPrice,
        status: 'pending'
      });

      res.status(201).json(order);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  getAllOrders: async (req, res) => {
    try {
      const orders = await req.models.Order.findAll();
      res.status(200).json(orders);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  getOrderById: async (req, res) => {
    try {
      const order = await req.models.Order.findByPk(req.params.id);
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }
      res.status(200).json(order);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  updateOrder: async (req, res) => {
    try {
      const order = await req.models.Order.findByPk(req.params.id);
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      await req.models.Order.update(req.body, {
        where: { id: req.params.id }
      });

      const updatedOrder = await req.models.Order.findByPk(req.params.id);
      res.status(200).json({ message: 'Order updated successfully', order: updatedOrder });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  deleteOrder: async (req, res) => {
    try {
      const result = await req.models.Order.destroy({
        where: { id: req.params.id }
      });

      if (result === 0) {
        return res.status(404).json({ message: 'Order not found' });
      }

      res.status(200).json({ message: 'Order deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = orderController;
