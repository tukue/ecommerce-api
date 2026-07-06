const AuthService = require('../services/authService');

describe('AuthService external user provisioning', () => {
  it('links an existing email account to an auth subject', async () => {
    const user = { id: 1, email: 'user@example.com', authSubject: null };
    const models = {
      User: {
        findOne: jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(user),
        update: jest.fn().mockResolvedValue([1]),
      },
    };
    const service = new AuthService(models);

    const result = await service.provisionUserFromToken({
      sub: 'provider|123',
      email: user.email,
      email_verified: true,
      name: 'Example User',
    });

    expect(result).toBe(user);
    expect(user.authSubject).toBe('provider|123');
    expect(models.User.update).toHaveBeenCalledWith(
      { authSubject: 'provider|123' },
      { where: { id: 1 } },
    );
  });

  it('generates a unique username for new external auth users', async () => {
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
      sub: 'provider|new',
      email: createdUser.email,
      email_verified: true,
      name: 'Example User',
    });

    expect(result).toBe(createdUser);
    expect(models.User.create).toHaveBeenCalledWith(
      expect.objectContaining({
        username: 'example_user_1',
        email: createdUser.email,
        authSubject: 'provider|new',
      }),
    );
  });

  it('rejects linking an existing account when the provider email is unverified', async () => {
    const user = { id: 1, email: 'user@example.com', authSubject: null };
    const models = {
      User: {
        findOne: jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(user),
        update: jest.fn(),
      },
    };
    const service = new AuthService(models);

    await expect(
      service.provisionUserFromToken({
        sub: 'provider|attacker',
        email: user.email,
        email_verified: false,
      }),
    ).rejects.toMatchObject({
      statusCode: 403,
      name: 'UnverifiedEmailError',
    });
    expect(models.User.update).not.toHaveBeenCalled();
  });
});
