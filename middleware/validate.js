const { z } = require('zod');

const validate = (schemas) => (req, res, next) => {
  try {
    if (schemas.body) {
      req.body = schemas.body.parse(req.body);
    }
    if (schemas.query) {
      req.query = schemas.query.parse(req.query);
    }
    if (schemas.params) {
      req.params = schemas.params.parse(req.params);
    }
    next();
  } catch (err) {
    if (err instanceof z.ZodError) {
      const messages = err.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      return res.status(400).json({
        error: 'ValidationError',
        message: messages,
        correlationId: req.correlationId,
      });
    }
    next(err);
  }
};

module.exports = validate;
