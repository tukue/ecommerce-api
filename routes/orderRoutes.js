const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authMiddleware } = require('../middleware/authMiddleWare');

router.post('/orders', authMiddleware, orderController.createOrder);
router.get('/orders', authMiddleware, orderController.getAllOrders);
router.get('/orders/:id', authMiddleware, orderController.getOrderById);
router.put('/orders/:id', authMiddleware, orderController.updateOrder);
router.delete('/orders/:id', authMiddleware, orderController.deleteOrder);

module.exports = router;
