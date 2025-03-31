const Order = require('../models/order');

/**
 * @swagger
 * components:
 *   schemas:
 *     Order:
 *       type: object
 *       required:
 *         - userId
 *         - productId
 *         - quantity
 *         - totalPrice
 *       properties:
 *         id:
 *           type: integer
 *           description: The auto-generated id of the order
 *         userId:
 *           type: integer
 *         productId:
 *           type: integer
 *         quantity:
 *           type: integer
 *         totalPrice:
 *           type: number
 *           format: float
 *       example:
 *         id: 1
 *         userId: 1
 *         productId: 1
 *         quantity: 2
 *         totalPrice: 200.0
 */
const orderController = {
  /**
   * @swagger
   * /api/orders:
   *   post:
   *     summary: Create a new order
   *     tags: [Orders]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/Order'
   *     responses:
   *       201:
   *         description: Order created successfully
   *       500:
   *         description: Internal server error
   */
  createOrder: async (req, res) => {
    try {
      const { userId, productId, quantity, totalPrice } = req.body;

      // Validate input data
      if (!userId || !productId || !quantity || !totalPrice) {
        return res.status(400).json({ error: 'Missing required fields: userId, productId, quantity, or totalPrice' });
      }

      // Create the order
      const order = await req.models.Order.create({
        userId,
        productId,
        quantity,
        totalPrice,
        status: 'pending', // Default status
      });

      return res.status(201).json(order);
    } catch (error) {
      console.error('Error creating order:', error);
      return res.status(500).json({ error: error.message });
    }
  },

  /**
   * @swagger
   * /api/orders:
   *   get:
   *     summary: Get all orders
   *     tags: [Orders]
   *     responses:
   *       200:
   *         description: List of all orders
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Order'
   *       500:
   *         description: Internal server error
   */
  async getAllOrders(req, res) {
    try {
      const orders = await req.models.Order.findAll({
        include: [
          { model: req.models.User, as: 'user', attributes: ['id', 'username', 'email'] },
          { model: req.models.Product, as: 'product', attributes: ['id', 'name', 'price'] }
        ]
      });
      res.status(200).json(orders);
    } catch (error) {
      console.error('Error getting orders:', error);
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * @swagger
   * /api/orders/{id}:
   *   get:
   *     summary: Get order by ID
   *     tags: [Orders]
   *     parameters:
   *       - in: path
   *         name: id
   *         schema:
   *           type: integer
   *         required: true
   *         description: The order ID
   *     responses:
   *       200:
   *         description: Order retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Order'
   *       404:
   *         description: Order not found
   *       500:
   *         description: Internal server error
   */
  async getOrderById(req, res) {
    try {
      const order = await req.models.Order.findByPk(req.params.id, {
        include: [
          { model: req.models.User, as: 'user', attributes: ['id', 'username', 'email'] },
          { model: req.models.Product, as: 'product', attributes: ['id', 'name', 'price'] }
        ]
      });
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }
      res.status(200).json(order);
    } catch (error) {
      console.error('Error getting order by ID:', error);
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * @swagger
   * /api/orders/{id}:
   *   put:
   *     summary: Update order by ID
   *     tags: [Orders]
   *     parameters:
   *       - in: path
   *         name: id
   *         schema:
   *           type: integer
   *         required: true
   *         description: The order ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/Order'
   *     responses:
   *       200:
   *         description: Order updated successfully
   *       404:
   *         description: Order not found
   *       500:
   *         description: Internal server error
   */
  updateOrder: async (req, res) => {
    try {
      const orderId = parseInt(req.params.id, 10);

      // Validate the order ID
      if (isNaN(orderId)) {
        return res.status(400).json({ error: 'Invalid order ID' });
      }

      // Find the order by ID
      const order = await req.models.Order.findByPk(orderId);
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      // Update the order with the provided fields
      const { quantity, total, status } = req.body;

      if (quantity !== undefined) {
        if (!Number.isInteger(quantity) || quantity <= 0) {
          return res.status(400).json({ error: 'Quantity must be a positive integer' });
        }
        order.quantity = quantity;
      }

      if (total !== undefined) {
        if (typeof total !== 'number' || total <= 0) {
          return res.status(400).json({ error: 'Total must be a positive number' });
        }
        order.total = total;
      }

      if (status !== undefined) {
        const allowedStatuses = ['pending', 'completed', 'cancelled'];
        if (!allowedStatuses.includes(status)) {
          return res.status(400).json({ error: `Status must be one of: ${allowedStatuses.join(', ')}` });
        }
        order.status = status;
      }

      await order.save();

      return res.status(200).json({ message: 'Order updated successfully', order });
    } catch (error) {
      console.error('Error updating order:', error);
      return res.status(500).json({ error: error.message });
    }
  },

  /**
   * @swagger
   * /api/orders/{id}:
   *   delete:
   *     summary: Delete order by ID
   *     tags: [Orders]
   *     parameters:
   *       - in: path
   *         name: id
   *         schema:
   *           type: integer
   *         required: true
   *         description: The order ID
   *     responses:
   *       200:
   *         description: Order deleted successfully
   *       404:
   *         description: Order not found
   *       500:
   *         description: Internal server error
   */
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

  /**
   * Mark an order as completed
   * @param {Object} req - The request object
   * @param {Object} res - The response object
   */
  async markOrderAsCompleted(req, res) {
    try {
      const orderId = parseInt(req.params.id, 10);

      // Validate the order ID
      if (isNaN(orderId)) {
        return res.status(400).json({ error: 'Invalid order ID' });
      }

      // Find the order by ID
      const order = await req.models.Order.findByPk(orderId);
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      // Check if the order is already completed
      if (order.status === 'completed') {
        return res.status(400).json({ error: 'Order is already completed' });
      }

      // Update the order status to completed
      order.status = 'completed';
      await order.save();

      return res.status(200).json({ message: 'Order status updated to completed', order });
    } catch (error) {
      console.error('Error updating order status:', error);
      return res.status(500).json({ error: error.message });
    }
  },
};

module.exports = orderController;