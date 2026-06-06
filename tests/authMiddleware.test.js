const jwt = require('jsonwebtoken');

const ORIGINAL_ENV = process.env;

const createResponse = () => {
  const res = {
    statusCode: null,
    body: null,
    status: jest.fn((code) => {
      res.statusCode = code;
      return res;
    }),
    json: jest.fn((body) => {
      res.body = body;
      return res;
    }),
  };

  return res;
};

const loadMiddleware = ({ externalAuthEnabled = false, verifyToken = jest.fn() } = {}) => {
  jest.resetModules();
  process.env = {
    ...ORIGINAL_ENV,
    JWT_SECRET: 'test-secret',
    AUTH_DOMAIN: externalAuthEnabled ? 'tenant.example.com' : '',
    AUTH_AUDIENCE: externalAuthEnabled ? 'https://api.example.com' : '',
    AUTH_ISSUER: '',
  };

  jest.doMock('../services/authProvider', () => ({
    init: jest.fn(),
    verifyToken,
  }));

  return require('../middleware/authMiddleWare');
};

describe('authMiddleware', () => {
  afterEach(() => {
    jest.dontMock('../services/authProvider');
    jest.resetModules();
    process.env = ORIGINAL_ENV;
  });

  it('accepts local JWTs when external auth is configured', async () => {
    const user = { id: 123, email: 'local@example.com' };
    const verifyToken = jest.fn();
    const { authMiddleware } = loadMiddleware({ externalAuthEnabled: true, verifyToken });
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET);
    const req = {
      headers: { authorization: `Bearer ${token}` },
      models: {
        User: {
          findByPk: jest.fn().mockResolvedValue(user),
        },
      },
    };
    const res = createResponse();
    const next = jest.fn();

    await authMiddleware(req, res, next);

    expect(req.user).toBe(user);
    expect(next).toHaveBeenCalledTimes(1);
    expect(verifyToken).not.toHaveBeenCalled();
  });

  it('provisions a user from an external token after local JWT verification fails', async () => {
    const provisionedUser = {
      id: 456,
      email: 'external@example.com',
      authSubject: 'provider|456',
    };
    const verifyToken = jest.fn().mockResolvedValue({
      sub: provisionedUser.authSubject,
      email: provisionedUser.email,
      name: 'External User',
    });
    const { authMiddleware } = loadMiddleware({ externalAuthEnabled: true, verifyToken });
    const req = {
      headers: { authorization: 'Bearer external-token' },
      models: {
        User: {
          findByPk: jest.fn(),
          findOne: jest
            .fn()
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(null),
          create: jest.fn().mockResolvedValue(provisionedUser),
          update: jest.fn(),
        },
      },
    };
    const res = createResponse();
    const next = jest.fn();

    await authMiddleware(req, res, next);

    expect(req.user).toBe(provisionedUser);
    expect(verifyToken).toHaveBeenCalledWith('external-token', {
      audience: 'https://api.example.com',
      issuer: 'https://tenant.example.com/',
    });
    expect(next).toHaveBeenCalledTimes(1);
  });
});
