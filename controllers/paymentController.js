const Payment = require('../models/payment');

/**
 * @swagger
 * components:
 *   schemas:
 *     Payment:
 *       type: object
 *       required:
 *         - userId
 *         - orderId
 *         - stripePaymentId
 *         - amount
 *         - currency
 *         - status
 *       properties:
 *         id:
 *           type: integer
 *           description: The auto-generated id of the payment
 *         userId:
 *           type: integer
 *           description: The id of the user who made the payment
 *         orderId:
 *           type: integer
 *           description: The id of the order associated with the payment
 *         stripePaymentId:
 *           type: string
 *           description: The Stripe payment id
 *         amount:
 *           type: number
 *           format: float
 *           description: The amount of the payment
 *         currency:
 *           type: string
 *           description: The currency of the payment
 *         status:
 *           type: string
 *           description: The status of the payment
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: The date and time when the payment was created
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: The date and time when the payment was last updated
 *       example:
 *         id: 1
 *         userId: 1
 *         orderId: 1
 *         stripePaymentId: 'pi_1F4ZyL2eZvKYlo2C1Gq6y7d2'
 *         amount: 100.0
 *         currency: 'usd'
 *         status: 'succeeded'
 *         created_at: '2023-10-01T00:00:00.000Z'
 *         updated_at: '2023-10-01T00:00:00.000Z'
 */
const paymentController = {
  /**
   * @swagger
   * /api/payments:
   *   post:
   *     summary: Create a new payment
   *     tags: [Payments]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/Payment'
   *     responses:
   *       201:
   *         description: Payment created successfully
   *       500:
   *         description: Internal server error
   */
  async createPayment(req, res) {
    try {
      const { userId, orderId, stripePaymentId, amount, currency, status } = req.body;

      // Validate input data
      if (!userId || !orderId || !amount || !currency) {
        return res.status(400).json({ error: 'Missing required fields: userId, orderId, amount, or currency' });
      }

      // Check if the order exists
      const order = await req.models.Order.findByPk(orderId);
      if (!order) {
        return res.status(404).json({ error: `Order with ID ${orderId} not found` });
      }

      // Create the payment
      const payment = await req.models.Payment.create({
        userId,
        orderId,
        stripePaymentId,
        amount,
        currency,
        status,
      });

      return res.status(201).json(payment);
    } catch (error) {
      console.error('Error creating payment:', error);
      return res.status(500).json({ error: error.message });
    }
  },

  /**
   * @swagger
   * /api/payments:
   *   get:
   *     summary: Get all payments
   *     tags: [Payments]
   *     responses:
   *       200:
   *         description: List of all payments
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Payment'
   *       500:
   *         description: Internal server error
   */
  async getAllPayments(req, res) {
    try {
      const payments = await req.models.Payment.findAll();
      return res.status(200).json(payments);
    } catch (error) {
      console.error('Error getting payments:', error);
      return res.status(500).json({ error: error.message });
    }
  },

  /**
   * @swagger
   * /api/payments/{id}:
   *   get:
   *     summary: Get payment by ID
   *     tags: [Payments]
   *     parameters:
   *       - in: path
   *         name: id
   *         schema:
   *           type: integer
   *         required: true
   *         description: The payment ID
   *     responses:
   *       200:
   *         description: Payment retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Payment'
   *       404:
   *         description: Payment not found
   *       500:
   *         description: Internal server error
   */
  async getPaymentById(req, res) {
    try {
      const payment = await req.models.Payment.findByPk(req.params.id);
      if (!payment) {
        return res.status(404).json({ error: 'Payment not found' });
      }
      return res.status(200).json(payment);
    } catch (error) {
      console.error('Error getting payment:', error);
      return res.status(500).json({ error: error.message });
    }
  }
};

module.exports = paymentController;