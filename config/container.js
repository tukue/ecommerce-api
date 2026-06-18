const ProductService = require('../services/productService');
const OrderService = require('../services/orderService');
const AuthService = require('../services/authService');
const PaymentService = require('../services/paymentService');

let services = new WeakMap();

function getProductService(models) {
  if (!services.has(models.Product)) {
    services.set(models.Product, new ProductService(models.Product));
  }
  return services.get(models.Product);
}

function getOrderService(models) {
  const key = models.Order;
  if (!services.has(key)) {
    services.set(key, new OrderService(models));
  }
  return services.get(key);
}

function getAuthService(models) {
  const key = models.User;
  if (!services.has(key)) {
    services.set(key, new AuthService(models));
  }
  return services.get(key);
}

function getPaymentService(models) {
  const key = models.Payment;
  if (!services.has(key)) {
    services.set(key, new PaymentService(models));
  }
  return services.get(key);
}

function clear() {
  services = new WeakMap();
}

module.exports = {
  getProductService,
  getOrderService,
  getAuthService,
  getPaymentService,
  clear,
};
