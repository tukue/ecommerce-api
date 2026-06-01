const HttpError = require('../utils/httpError');
const OrderRepository = require('../repositories/orderRepository');

const parsePositiveInteger = (value, fieldName) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new HttpError(400, `${fieldName} must be a positive integer`, 'ValidationError');
  }

  return parsed;
};

const calculateOrderTotal = (product, quantity) => Number(product.price) * quantity;

class OrderService {
  constructor(models) {
    this.models = models;
    this.repository = new OrderRepository(models);
  }

  async createOrder(input, currentUser = null) {
    const userId = currentUser ? currentUser.id : input.userId;
    const { productId, quantity } = input;

    if (!userId || !productId || quantity === undefined) {
      throw new HttpError(
        400,
        'Missing required fields: userId, productId, or quantity',
        'ValidationError',
      );
    }

    const parsedQuantity = parsePositiveInteger(quantity, 'Quantity');

    const user = await this.repository.findUserById(userId);
    if (!user) {
      throw new HttpError(404, 'User not found', 'NotFoundError');
    }

    const product = await this.repository.findProductById(productId);
    if (!product) {
      throw new HttpError(404, 'Product not found', 'NotFoundError');
    }

    return this.repository.create({
      userId,
      productId,
      quantity: parsedQuantity,
      total: calculateOrderTotal(product, parsedQuantity),
      status: 'pending',
    });
  }

  getAllOrders(currentUser = null) {
    const where = currentUser && currentUser.role !== 'admin' ? { userId: currentUser.id } : {};

    return this.repository.findAll({
      where,
      include: [
        {
          model: this.models.Product,
          as: 'product',
          attributes: ['id', 'name', 'price'],
        },
      ],
    });
  }

  async getOrderById(id, currentUser = null) {
    const order = await this.repository.findById(id, {
      include: [
        {
          model: this.models.Product,
          as: 'product',
          attributes: ['id', 'name', 'price'],
        },
        {
          model: this.models.Payment,
          as: 'payment',
        },
      ],
    });

    if (!order) {
      throw new HttpError(404, 'Order not found', 'NotFoundError');
    }

    this.assertOrderAccess(order, currentUser);
    return order;
  }

  async updateOrder(id, input, currentUser = null) {
    const order = await this.getOrderForMutation(id, currentUser);
    const updateData = {};

    if (input.quantity !== undefined) {
      const parsedQuantity = parsePositiveInteger(input.quantity, 'Quantity');
      updateData.quantity = parsedQuantity;
      updateData.total = calculateOrderTotal(order.product, parsedQuantity);
    }

    if (input.status !== undefined && currentUser?.role === 'admin') {
      updateData.status = input.status;
    }

    await this.repository.updateById(id, updateData);
    const updatedOrder = await this.repository.findById(id);
    return { message: 'Order updated successfully', order: updatedOrder };
  }

  async deleteOrder(id, currentUser = null) {
    await this.getOrderForMutation(id, currentUser);
    await this.repository.deleteById(id);
  }

  async getOrderForMutation(id, currentUser = null) {
    const order = await this.repository.findById(id, {
      include: [{ model: this.models.Product, as: 'product' }],
    });

    if (!order) {
      throw new HttpError(404, 'Order not found', 'NotFoundError');
    }

    this.assertOrderAccess(order, currentUser, 'Access denied: This is not your order');
    return order;
  }

  assertOrderAccess(order, currentUser, message = 'Access denied') {
    if (currentUser && currentUser.role !== 'admin' && order.userId !== currentUser.id) {
      throw new HttpError(403, message, 'ForbiddenError');
    }
  }
}

module.exports = OrderService;
