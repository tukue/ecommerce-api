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

const loadMiddleware = ({ auth0Enabled = false, verifyAuth0Token = jest.fn() } = {}) => {
  jest.resetModules();
  process.env = {
    ...ORIGINAL_ENV,
    JWT_SECRET: 'test-secret',
    AUTH0_DOMAIN: auth0Enabled ? 'tenant.example.com' : '',
    AUTH0_AUDIENCE: auth0Enabled ? 'https://api.example.com' : '',
    AUTH0_ISSUER: '',
  };

  jest.doMock('../services/authProvider', () => ({
    init: jest.fn(),
    verifyAuth0Token,
  }));

  return require('../middleware/authMiddleWare');
};

describe('authMiddleware', () => {
  afterEach(() => {
    jest.dontMock('../services/authProvider');
    jest.resetModules();
    process.env = ORIGINAL_ENV;
  });

  it('accepts local JWTs when Auth0 is configured', async () => {
    const user = { id: 123, email: 'local@example.com' };
    const verifyAuth0Token = jest.fn();
    const { authMiddleware } = loadMiddleware({ auth0Enabled: true, verifyAuth0Token });
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
    expect(verifyAuth0Token).not.toHaveBeenCalled();
  });

  it('provisions a user from an Auth0 token after local JWT verification fails', async () => {
    const provisionedUser = { id: 456, email: 'auth0@example.com', auth0Id: 'auth0|456' };
    const verifyAuth0Token = jest.fn().mockResolvedValue({
      sub: provisionedUser.auth0Id,
      email: provisionedUser.email,
      name: 'Auth0 User',
    });
    const { authMiddleware } = loadMiddleware({ auth0Enabled: true, verifyAuth0Token });
    const req = {
      headers: { authorization: 'Bearer auth0-token' },
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
    expect(verifyAuth0Token).toHaveBeenCalledWith('auth0-token', {
      audience: 'https://api.example.com',
      issuer: 'https://tenant.example.com/',
    });
    expect(next).toHaveBeenCalledTimes(1);
  });
});
