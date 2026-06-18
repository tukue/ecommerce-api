const {
  httpRequestDuration,
  httpRequestTotal,
  inFlightRequests,
  apiErrorTotal,
} = require('../config/metrics');

function metricsMiddleware() {
  return (req, res, next) => {
    const end = httpRequestDuration.startTimer();
    inFlightRequests.inc();

    res.on('finish', () => {
      const route = req.route ? req.route.path : req.path;
      const labels = { method: req.method, route, status_code: String(res.statusCode) };

      end(labels);
      httpRequestTotal.inc(labels);

      if (res.statusCode >= 400) {
        apiErrorTotal.inc({ route, method: req.method, status_code: String(res.statusCode) });
      }

      inFlightRequests.dec();
    });

    next();
  };
}

module.exports = metricsMiddleware;
