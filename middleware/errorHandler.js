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
  const isProduction = process.env.NODE_ENV === 'production';
  const isInternalError = status >= 500;
  const responseMessage =
    isProduction && isInternalError ? 'Unexpected error occurred' : err.message;
  const responseError =
    isProduction && isInternalError ? 'InternalServerError' : err.name || 'InternalServerError';

  logger.error('request_failed', {
    correlationId: req.correlationId,
    method: req.method,
    path: req.originalUrl,
    statusCode: status,
    error: err.message,
    stack: isProduction ? undefined : err.stack,
  });

  res.status(status).json({
    error: responseError,
    message: responseMessage || 'Unexpected error occurred',
    correlationId: req.correlationId,
  });
}

module.exports = {
  notFoundHandler,
  errorHandler,
};
