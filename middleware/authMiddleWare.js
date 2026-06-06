const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const AuthService = require('../services/authService');
const authProvider = require('../services/authProvider');

const rateLimitMessage = (message) => ({
  error: 'RateLimitExceeded',
  message,
});

const skipRateLimitInTests = () => process.env.NODE_ENV === 'test';

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipRateLimitInTests,
  message: rateLimitMessage('Too many requests, please try again later'),
});

const mutatingApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => skipRateLimitInTests() || !['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method),
  message: rateLimitMessage('Too many write requests, please try again later'),
});

const authSensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipRateLimitInTests,
  message: rateLimitMessage('Too many attempts, please try again after 15 minutes'),
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipRateLimitInTests,
  message: { message: 'Too many login attempts, please try again after 15 minutes' },
});

const auth0Domain = process.env.AUTH0_DOMAIN || '';
const auth0Audience = process.env.AUTH0_AUDIENCE || '';
const auth0Issuer = process.env.AUTH0_ISSUER || (auth0Domain ? `https://${auth0Domain}/` : '');
const isAuth0Enabled = Boolean(auth0Domain && auth0Audience);

const getBearerToken = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.split(' ')[1];
};

const authenticateLocalToken = async (req, token) => {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const user = await req.models.User.findByPk(decoded.userId);
  if (!user) {
    return null;
  }

  return user;
};

const authenticateAuth0Token = async (req, token) => {
  const decoded = await authProvider.verifyAuth0Token(token, {
    audience: auth0Audience,
    issuer: auth0Issuer,
  });
  const authService = new AuthService(req.models);
  return authService.provisionUserFromToken(decoded);
};

const authMiddleware = async (req, res, next) => {
  try {
    if (req.oidc && typeof req.oidc.isAuthenticated === 'function' && req.oidc.isAuthenticated()) {
      const authService = new AuthService(req.models);
      const user = await authService.provisionUserFromOidc(req.oidc.user || {});
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }
      req.user = user;
      return next();
    }

    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    try {
      const user = await authenticateLocalToken(req, token);
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }
      req.user = user;
      return next();
    } catch (error) {
      if (!isAuth0Enabled || error.name === 'TokenExpiredError') {
        throw error;
      }
    }

    const user = await authenticateAuth0Token(req, token);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token has expired. Please log in again.' });
    } else if (error.name === 'JsonWebTokenError' || error.name === 'InvalidTokenError') {
      return res.status(401).json({ message: 'Invalid token. Please log in again.' });
    }
    console.error('Authentication error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const adminMiddleware = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }

  next();
};

const optionalAuthMiddleware = async (req, res, next) => {
  try {
    if (req.oidc && typeof req.oidc.isAuthenticated === 'function' && req.oidc.isAuthenticated()) {
      const authService = new AuthService(req.models);
      const user = await authService.provisionUserFromOidc(req.oidc.user || {});
      if (user) {
        req.user = user;
      }
      return next();
    }

    const token = getBearerToken(req);
    if (token) {
      try {
        const user = await authenticateLocalToken(req, token);
        if (user) {
          req.user = user;
          return next();
        }
      } catch {
        // ignore invalid token
      }

      if (isAuth0Enabled) {
        try {
          const user = await authenticateAuth0Token(req, token);
          if (user) {
            req.user = user;
          }
        } catch {
          // ignore invalid token
        }
      }
    }
  } catch {
    // swallow
  }
  next();
};

module.exports = {
  authMiddleware,
  loginLimiter,
  apiLimiter,
  mutatingApiLimiter,
  authSensitiveLimiter,
  adminMiddleware,
  optionalAuthMiddleware,
};
