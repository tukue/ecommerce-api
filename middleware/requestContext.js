const crypto = require('crypto');

function requestContext(req, res, next) {
  const correlationId = req.header('x-correlation-id') || crypto.randomUUID();
  req.correlationId = correlationId;
  res.setHeader('x-correlation-id', correlationId);
  next();
}

module.exports = requestContext;
