const Order = {
  create: jest.fn(),
  findByPk: jest.fn(),
  findAll: jest.fn(),
};

const User = {
  findByPk: jest.fn(),
};

const Product = {
  findByPk: jest.fn(),
};

module.exports = { Order, User, Product };
