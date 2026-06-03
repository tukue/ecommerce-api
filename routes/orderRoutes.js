const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const validate = require('../middleware/validate');
const { createOrder, updateOrder } = require('../utils/validators');
const { authMiddleware } = require('../middleware/authMiddleWare');

router.post(
  '/orders',
  authMiddleware,
  validate({ body: createOrder }),
  orderController.createOrder,
);
router.get('/orders', authMiddleware, orderController.getAllOrders);
router.get('/orders/:id', authMiddleware, orderController.getOrderById);
router.put(
  '/orders/:id',
  authMiddleware,
  validate({ body: updateOrder }),
  orderController.updateOrder,
);
router.delete('/orders/:id', authMiddleware, orderController.deleteOrder);

module.exports = router;
