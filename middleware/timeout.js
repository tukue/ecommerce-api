function timeoutMiddleware(timeoutMs = 30000) {
  return (req, res, next) => {
    req.setTimeout(timeoutMs, () => {
      if (!res.headersSent) {
        res.status(503).json({
          error: 'RequestTimeout',
          message: 'Request timed out',
          correlationId: req.correlationId,
        });
      }
    });
    next();
  };
}

module.exports = timeoutMiddleware;
