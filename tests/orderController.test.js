// tests/orderController.test.js

// Import the controller
const orderController = require('../controllers/orderController');

// Mock the models
const mockReq = {
  models: {
    Order: {
      create: jest.fn(),
      findAll: jest.fn(),
      findByPk: jest.fn(),
      destroy: jest.fn(),
      update: jest.fn()
    },
    User: {
      findByPk: jest.fn()
    },
    Product: {
      findByPk: jest.fn()
    }
  }
};

describe('Order Controller', () => {
  let req, res;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Setup request and response
    req = {
      body: {
        userId: 1,
        productId: 1,
        quantity: 2,
        totalPrice: 200
      },
      params: { id: '1' },
      models: mockReq.models
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  describe('createOrder', () => {
    it('should create order successfully', async () => {
      // Setup
      const mockOrder = { 
        id: 1, 
        userId: 1,
        productId: 1,
        quantity: 2,
        total: 200,
        status: 'pending' 
      };
      req.models.Order.create.mockResolvedValue(mockOrder);
      req.models.User.findByPk.mockResolvedValue({ id: 1 });
      req.models.Product.findByPk.mockResolvedValue({ id: 1 });

      // Execute
      await orderController.createOrder(req, res);

      // Assert
      expect(req.models.Order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 1,
          productId: 1,
          quantity: 2,
          total: 200,
          status: 'pending'
        })
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining(mockOrder));
    });

    it('should return 400 if required fields are missing', async () => {
      // Setup
      req.body = {};

      // Execute
      await orderController.createOrder(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(String)
        })
      );
    });
  });

  describe('getAllOrders', () => {
    it('should return all orders', async () => {
      // Setup
      const mockOrders = [
        { id: 1, userId: 1, productId: 1 },
        { id: 2, userId: 2, productId: 2 }
      ];
      req.models.Order.findAll.mockResolvedValue(mockOrders);

      // Execute
      await orderController.getAllOrders(req, res);

      // Assert
      expect(req.models.Order.findAll).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockOrders);
    });
  });

  describe('getOrderById', () => {
    it('should return order by id', async () => {
      // Setup
      const mockOrder = { id: 1, userId: 1, productId: 1 };
      req.models.Order.findByPk.mockResolvedValue(mockOrder);

      // Execute
      await orderController.getOrderById(req, res);

      // Assert
      expect(req.models.Order.findByPk).toHaveBeenCalledWith('1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockOrder);
    });

    it('should return 404 if order not found', async () => {
      // Setup
      req.models.Order.findByPk.mockResolvedValue(null);

      // Execute
      await orderController.getOrderById(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Order not found'
      }));
    });
  });

  describe('updateOrder', () => {
    it('should update order successfully', async () => {
      // Setup
      const mockOrder = {
        id: 1,
        quantity: 3,
        totalPrice: 300,
        status: 'pending'
      };
      req.models.Order.findByPk.mockResolvedValue(mockOrder);
      req.models.Order.update.mockResolvedValue([1]);

      // Execute
      await orderController.updateOrder(req, res);

      // Assert
      expect(req.models.Order.update).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 404 if order not found', async () => {
      // Setup
      req.models.Order.findByPk.mockResolvedValue(null);

      // Execute
      await orderController.updateOrder(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Order not found'
      }));
    });
  });

  describe('deleteOrder', () => {
    it('should delete order successfully', async () => {
      // Setup
      req.models.Order.destroy.mockResolvedValue(1);

      // Execute
      await orderController.deleteOrder(req, res);

      // Assert
      expect(req.models.Order.destroy).toHaveBeenCalledWith({
        where: { id: '1' }
      });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 404 if order not found', async () => {
      // Setup
      req.models.Order.destroy.mockResolvedValue(0);

      // Execute
      await orderController.deleteOrder(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});
