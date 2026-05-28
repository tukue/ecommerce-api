const logger = require('../utils/logger');

function notFoundHandler(req, res) {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} does not exist`,
    correlationId: req.correlationId,
  });
}

function errorHandler(err, req, res, _next) {
  const status = err.statusCode || 500;
  logger.error('request_failed', {
    correlationId: req.correlationId,
    method: req.method,
    path: req.originalUrl,
    statusCode: status,
    error: err.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });

  res.status(status).json({
    error: err.name || 'InternalServerError',
    message: err.message || 'Unexpected error occurred',
    correlationId: req.correlationId,
  });
}

module.exports = {
  notFoundHandler,
  errorHandler,
};
