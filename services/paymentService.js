const HttpError = require('../utils/httpError');
const PaymentRepository = require('../repositories/paymentRepository');

class PaymentService {
  constructor(models) {
    this.models = models;
    this.repository = new PaymentRepository(models);
  }

  async createPayment(input, currentUser = null) {
    const userId = currentUser ? currentUser.id : input.userId;
    const { orderId, stripePaymentId, amount, currency, status } = input;

    if (!userId || !orderId || amount === undefined || !currency) {
      throw new HttpError(
        400,
        'Missing required fields: userId, orderId, amount, or currency',
        'ValidationError',
      );
    }

    const paymentAmount = Number(amount);
    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      throw new HttpError(400, 'amount must be positive', 'ValidationError');
    }

    const order = await this.repository.findOrderById(orderId);
    if (!order) {
      throw new HttpError(404, `Order with ID ${orderId} not found`, 'NotFoundError');
    }

    this.assertPaymentAccess(order, currentUser, 'Access denied: This is not your order');

    return this.repository.create({
      userId,
      orderId,
      stripePaymentId,
      amount,
      currency,
      status: status || 'pending',
    });
  }

  getAllPayments(currentUser = null) {
    const where = currentUser && currentUser.role !== 'admin' ? { userId: currentUser.id } : {};

    return this.repository.findAll({
      where,
      include: [
        {
          model: this.models.Order,
          as: 'order',
        },
      ],
    });
  }

  async getPaymentById(id, currentUser = null) {
    const payment = await this.repository.findById(id, {
      include: [
        {
          model: this.models.Order,
          as: 'order',
        },
      ],
    });

    if (!payment) {
      throw new HttpError(404, 'Payment not found', 'NotFoundError');
    }

    if (currentUser && currentUser.role !== 'admin' && payment.userId !== currentUser.id) {
      throw new HttpError(403, 'Access denied', 'ForbiddenError');
    }

    return payment;
  }

  assertPaymentAccess(order, currentUser, message) {
    if (currentUser && currentUser.role !== 'admin' && order.userId !== currentUser.id) {
      throw new HttpError(403, message, 'ForbiddenError');
    }
  }
}

module.exports = PaymentService;
