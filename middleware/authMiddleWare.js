const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: 'Too many login attempts, please try again after 15 minutes' },
});

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await req.models.User.findByPk(decoded.userId);
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
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await req.models.User.findByPk(decoded.userId);
      if (user) {
        req.user = user;
      }
    }
  } catch {
    // Token invalid/expired - just continue without user
  }
  next();
};

module.exports = { authMiddleware, loginLimiter, adminMiddleware, optionalAuthMiddleware };
