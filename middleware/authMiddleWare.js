const jwt = require('jsonwebtoken');
const jwksRsa = require('jwks-rsa');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');

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

// Configure JWKS client if Auth0 is enabled via env
const auth0Domain = process.env.AUTH0_DOMAIN || '';
const auth0Audience = process.env.AUTH0_AUDIENCE || '';
const auth0Issuer = process.env.AUTH0_ISSUER || (auth0Domain ? `https://${auth0Domain}/` : '');

// Unified auth module
const auth = require('../services/auth');

// auth.init will be called from app startup when available


const authMiddleware = async (req, res, next) => {
  try {
    // If express-openid-connect session exists, trust it and map to local user
    if (req.oidc && typeof req.oidc.isAuthenticated === 'function' && req.oidc.isAuthenticated()) {
      const oidcUser = req.oidc.user || {};
      const user = await auth.provisionFromOidc(req.models, oidcUser);
      if (!user) return res.status(401).json({ message: 'User not found' });
      req.user = user;
      return next();
    }

    // Next try: Authorization: Bearer <token>
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    let decoded;

    if (auth0Domain && auth0Audience) {
      // Validate access token issued by Auth0 using JWKS
      const decodedHeader = jwt.decode(token, { complete: true });
      if (!decodedHeader || !decodedHeader.header || !decodedHeader.header.kid) {
        return res.status(401).json({ message: 'Invalid token header' });
      }

      // verify token and provision user via unified auth module
      const decoded = await auth.verifyToken(token, { audience: auth0Audience, issuer: auth0Issuer });
      const user = await auth.provisionFromToken(req.models, decoded);
      if (!user) return res.status(401).json({ message: 'User not found' });
      req.user = user;
      return next();
    }

    // Fallback: local JWT verification
    const localDecoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await req.models.User.findByPk(localDecoded.userId);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token has expired. Please log in again.' });
    } else if (error.name === 'JsonWebTokenError') {
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
    // If OIDC session exists, map to local user
    if (req.oidc && typeof req.oidc.isAuthenticated === 'function' && req.oidc.isAuthenticated()) {
      const oidcUser = req.oidc.user || {};
      const AuthService = require('../services/authService');
      const authService = new AuthService(req.models);
      const user = await authService.provisionUserFromOidc(oidcUser);
      if (user) req.user = user;
      return next();
    }

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];

      if (auth0Domain && auth0Audience) {
        try {
          const decodedHeader = jwt.decode(token, { complete: true });
          if (decodedHeader && decodedHeader.header && decodedHeader.header.kid) {
            const decoded = await authProvider.verifyAuth0Token(token, { audience: auth0Audience, issuer: auth0Issuer });
            const AuthService = require('../services/authService');
            const authService = new AuthService(req.models);
            const user = await authService.provisionUserFromToken(decoded);
            if (user) req.user = user;
          }
        } catch (e) {
          // ignore invalid token
        }
      } else {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          const user = await req.models.User.findByPk(decoded.userId);
          if (user) req.user = user;
        } catch (e) {
          // ignore invalid token
        }
      }
    }
  } catch (e) {
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
