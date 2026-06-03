const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/authMiddleWare');
const validate = require('../middleware/validate');
const { createPayment } = require('../utils/validators');
const paymentController = require('../controllers/paymentController');

router.post('/', authMiddleware, validate({ body: createPayment }), paymentController.createPayment);
router.get('/', authMiddleware, paymentController.getAllPayments);
router.get('/:id', authMiddleware, paymentController.getPaymentById);

module.exports = router;
