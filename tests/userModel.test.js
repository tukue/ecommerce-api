const { Sequelize, DataTypes } = require('sequelize');
const UserModel = require('../models/user');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: ':memory:',
  logging: false
});

const User = UserModel(sequelize, DataTypes);

describe('User Model', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  afterEach(async () => {
    await User.destroy({ where: {}, truncate: true });
  });

  it('should create a user successfully', async () => {
    const validUser = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123'
    };

    const user = await User.create(validUser);
    
    expect(user).toBeDefined();
    expect(user.username).toBe(validUser.username);
    expect(user.email).toBe(validUser.email);
    // Password should be hashed
    expect(user.password).not.toBe(validUser.password);
  });

  it('should not create a user without required fields', async () => {
    const invalidUser = {
      username: 'testuser'
    };

    await expect(User.create(invalidUser)).rejects.toThrow();
  });

  it('should not create a user with invalid email', async () => {
    const invalidUser = {
      username: 'testuser',
      email: 'invalid-email',
      password: 'password123'
    };

    await expect(User.create(invalidUser)).rejects.toThrow();
  });

  it('should not create a user with password less than 6 characters', async () => {
    const invalidUser = {
      username: 'testuser',
      email: 'test@example.com',
      password: '12345'
    };

    await expect(User.create(invalidUser)).rejects.toThrow();
  });
});
