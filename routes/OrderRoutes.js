const express = require('express');
const router = express.Router();
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleWare');

const parseQuantity = (quantity) => {
  const parsedQuantity = Number(quantity);
  return Number.isInteger(parsedQuantity) && parsedQuantity > 0 ? parsedQuantity : null;
};
const calculateOrderTotal = (product, quantity) => Number(product.price) * quantity;

const checkOrderOwnership = async (req, res, next) => {
  try {
    const order = await req.models.Order.findByPk(req.params.id);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    if (req.user.role !== 'admin' && order.userId !== req.user.id) {
      return res.status(403).json({ message: 'Access denied: This is not your order' });
    }
    
    req.order = order;
    next();
  } catch (error) {
    console.error('Ownership check error:', error);
    res.status(500).json({ error: error.message });
  }
};

const orderController = {
  createOrder: async (req, res) => {
    try {
      const { productId, quantity } = req.body;

      if (!productId || !quantity) {
        return res.status(400).json({
          error: 'Missing required fields: productId or quantity'
        });
      }

      const parsedQuantity = parseQuantity(quantity);
      if (!parsedQuantity) {
        return res.status(400).json({ error: 'Quantity must be a positive integer' });
      }

      const product = await req.models.Product.findByPk(productId);
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      const calculatedTotal = calculateOrderTotal(product, parsedQuantity);

      const order = await req.models.Order.create({
        userId: req.user.id,
        productId,
        quantity: parsedQuantity,
        total: calculatedTotal,
        status: 'pending'
      });

      res.status(201).json(order);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  getAllOrders: async (req, res) => {
    try {
      let whereClause = {};
      
      if (req.user.role !== 'admin') {
        whereClause = { userId: req.user.id };
      }

      const orders = await req.models.Order.findAll({
        where: whereClause,
        include: [
          {
            model: req.models.Product,
            as: 'product',
            attributes: ['id', 'name', 'price']
          }
        ]
      });
      res.status(200).json(orders);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  getOrderById: async (req, res) => {
    try {
      const order = await req.models.Order.findByPk(req.params.id, {
        include: [
          {
            model: req.models.Product,
            as: 'product',
            attributes: ['id', 'name', 'price']
          },
          {
            model: req.models.Payment,
            as: 'payment'
          }
        ]
      });
      
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }
      
      if (req.user.role !== 'admin' && order.userId !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      res.status(200).json(order);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  updateOrder: async (req, res) => {
    try {
      const { quantity, status } = req.body;
      const updateData = {};
      
      if (quantity !== undefined) {
        const parsedQuantity = parseQuantity(quantity);
        if (!parsedQuantity) {
          return res.status(400).json({ error: 'Quantity must be a positive integer' });
        }

        const order = await req.models.Order.findByPk(req.params.id, {
          include: [{ model: req.models.Product, as: 'product' }]
        });

        if (!order) {
          return res.status(404).json({ message: 'Order not found' });
        }

        updateData.quantity = parsedQuantity;
        updateData.total = calculateOrderTotal(order.product, parsedQuantity);
      }

      if (status !== undefined && req.user.role === 'admin') {
        updateData.status = status;
      }

      await req.models.Order.update(updateData, {
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
      await req.models.Order.destroy({
        where: { id: req.params.id }
      });

      res.status(200).json({ message: 'Order deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

router.post('/orders', authMiddleware, orderController.createOrder);
router.get('/orders', authMiddleware, orderController.getAllOrders);
router.get('/orders/:id', authMiddleware, orderController.getOrderById);
router.put('/orders/:id', authMiddleware, checkOrderOwnership, orderController.updateOrder);
router.delete('/orders/:id', authMiddleware, checkOrderOwnership, orderController.deleteOrder);

module.exports = router;
