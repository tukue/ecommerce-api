function timeoutMiddleware(timeoutMs = 30000) {
  return (req, res, next) => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        res.status(503).json({
          error: 'RequestTimeout',
          message: 'Request timed out',
          correlationId: req.correlationId,
        });
      }
    }, timeoutMs);
    res.on('finish', () => clearTimeout(timeout));
    res.on('close', () => clearTimeout(timeout));
    next();
  };
}

module.exports = timeoutMiddleware;
