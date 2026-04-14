const { trace } = require('@opentelemetry/api');

function telemetryMiddleware() {
  return (req, res, next) => {
    const currentSpan = trace.getActiveSpan();

    if (currentSpan) {
      currentSpan.setAttribute('http.user_agent', req.headers['user-agent'] || 'unknown');
      currentSpan.setAttribute('http.remote_ip', req.ip);
      currentSpan.setAttribute('request.correlation_id', req.correlationId || 'missing');

      if (req.user) {
        currentSpan.setAttribute('user.id', req.user.id);
      }
    }

    next();
  };
}

module.exports = telemetryMiddleware;
