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

// Allow OIDC middleware to set req.oidc when express-openid-connect is used
const jwksClient = auth0Domain
  ? jwksRsa({
      jwksUri: `${auth0Issuer.replace(/\/$/, '')}.well-known/jwks.json`,
      cache: true,
      rateLimit: true,
    })
  : null;

const getSigningKey = (kid) =>
  new Promise((resolve, reject) => {
    if (!jwksClient) return reject(new Error('JWKS client not configured'));
    jwksClient.getSigningKey(kid, (err, key) => {
      if (err) return reject(err);
      try {
        const pubKey = key.getPublicKey();
        resolve(pubKey);
      } catch (e) {
        reject(e);
      }
    });
  });

const authMiddleware = async (req, res, next) => {
  try {
    // If express-openid-connect session exists, trust it and map to local user
    if (req.oidc && typeof req.oidc.isAuthenticated === 'function' && req.oidc.isAuthenticated()) {
      const oidcUser = req.oidc.user || {};
      const email = oidcUser.email;
      if (!email) return res.status(401).json({ message: 'Authenticated session missing email' });

      let user = await req.models.User.findOne({ where: { email } });
      if (!user) {
        const usernameBase = oidcUser.name ? oidcUser.name.replace(/\s+/g, '_').toLowerCase() : email.split('@')[0];
        const username = usernameBase.slice(0, 30);
        const randomPassword = crypto.randomBytes(24).toString('hex');
        user = await req.models.User.create({ username, email, password: randomPassword });
      }

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

      const kid = decodedHeader.header.kid;
      const publicKey = await getSigningKey(kid);

      decoded = jwt.verify(token, publicKey, {
        audience: auth0Audience,
        issuer: auth0Issuer,
        algorithms: ['RS256'],
      });

      // Auth0 tokens usually contain email; map to local user by email
      let user = null;
      if (decoded.email) {
        user = await req.models.User.findOne({ where: { email: decoded.email } });
      }

      // If user doesn't exist, create a lightweight account (random password)
      if (!user && decoded.email) {
        const usernameBase = decoded.name ? decoded.name.replace(/\s+/g, '_').toLowerCase() : decoded.email.split('@')[0];
        const username = usernameBase.slice(0, 30);
        const randomPassword = crypto.randomBytes(24).toString('hex');
        user = await req.models.User.create({ username, email: decoded.email, password: randomPassword });
      }

      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }

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
      if (oidcUser.email) {
        const user = await req.models.User.findOne({ where: { email: oidcUser.email } });
        if (user) req.user = user;
      }
      return next();
    }

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];

      if (auth0Domain && auth0Audience) {
        try {
          const decodedHeader = jwt.decode(token, { complete: true });
          if (decodedHeader && decodedHeader.header && decodedHeader.header.kid) {
            const publicKey = await getSigningKey(decodedHeader.header.kid);
            const decoded = jwt.verify(token, publicKey, {
              audience: auth0Audience,
              issuer: auth0Issuer,
              algorithms: ['RS256'],
            });
            if (decoded.email) {
              const user = await req.models.User.findOne({ where: { email: decoded.email } });
              if (user) req.user = user;
            }
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
