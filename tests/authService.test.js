const AuthService = require('../services/authService');

describe('AuthService external user provisioning', () => {
  it('links an existing email account to an Auth0 subject', async () => {
    const user = { id: 1, email: 'user@example.com', auth0Id: null };
    const models = {
      User: {
        findOne: jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(user),
        update: jest.fn().mockResolvedValue([1]),
      },
    };
    const service = new AuthService(models);

    const result = await service.provisionUserFromToken({
      sub: 'auth0|123',
      email: user.email,
      name: 'Example User',
    });

    expect(result).toBe(user);
    expect(user.auth0Id).toBe('auth0|123');
    expect(models.User.update).toHaveBeenCalledWith({ auth0Id: 'auth0|123' }, { where: { id: 1 } });
  });

  it('generates a unique username for new Auth0 users', async () => {
    const createdUser = { id: 2, email: 'new@example.com', username: 'example_user_1' };
    const models = {
      User: {
        findOne: jest
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({ id: 99, username: 'example_user' })
          .mockResolvedValueOnce(null),
        create: jest.fn().mockResolvedValue(createdUser),
      },
    };
    const service = new AuthService(models);

    const result = await service.provisionUserFromOidc({
      sub: 'auth0|new',
      email: createdUser.email,
      name: 'Example User',
    });

    expect(result).toBe(createdUser);
    expect(models.User.create).toHaveBeenCalledWith(
      expect.objectContaining({
        username: 'example_user_1',
        email: createdUser.email,
        auth0Id: 'auth0|new',
      }),
    );
  });
});
