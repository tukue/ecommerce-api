const container = require('../config/container');

describe('container', () => {
  let models;

  beforeEach(() => {
    container.clear();
    models = {
      User: { name: 'UserModel' },
      Product: { name: 'ProductModel' },
      Order: { name: 'OrderModel' },
      Payment: { name: 'PaymentModel' },
    };
  });

  describe('getAuthService', () => {
    it('returns an auth service instance', () => {
      const service = container.getAuthService(models);
      expect(service).toBeDefined();
      expect(service.constructor.name).toBe('AuthService');
    });

    it('returns the same instance for the same model key', () => {
      const a = container.getAuthService(models);
      const b = container.getAuthService(models);
      expect(a).toBe(b);
    });

    it('returns a new instance after clear()', () => {
      const before = container.getAuthService(models);
      container.clear();
      const after = container.getAuthService(models);
      expect(after).not.toBe(before);
    });
  });

  describe('getProductService', () => {
    it('returns a product service instance', () => {
      const service = container.getProductService(models);
      expect(service).toBeDefined();
      expect(service.constructor.name).toBe('ProductService');
    });

    it('returns the same instance for the same model key', () => {
      const a = container.getProductService(models);
      const b = container.getProductService(models);
      expect(a).toBe(b);
    });
  });

  describe('getOrderService', () => {
    it('returns an order service instance', () => {
      const service = container.getOrderService(models);
      expect(service).toBeDefined();
      expect(service.constructor.name).toBe('OrderService');
    });
  });

  describe('getPaymentService', () => {
    it('returns a payment service instance', () => {
      const service = container.getPaymentService(models);
      expect(service).toBeDefined();
      expect(service.constructor.name).toBe('PaymentService');
    });
  });

  describe('clear', () => {
    it('invalidates all cached services', () => {
      const s1 = container.getAuthService(models);
      const s2 = container.getOrderService(models);
      container.clear();
      expect(container.getAuthService(models)).not.toBe(s1);
      expect(container.getOrderService(models)).not.toBe(s2);
    });
  });
});
