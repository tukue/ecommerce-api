const { trace } = require('@opentelemetry/api');
const { cartOperationsTotal } = require('../config/metrics');

function telemetryMiddleware() {
  return (req, res, next) => {
    const currentSpan = trace.getActiveSpan();
    
    if (currentSpan) {
      // Add custom attributes to the span
      currentSpan.setAttribute('http.user_agent', req.headers['user-agent']);
      currentSpan.setAttribute('http.remote_ip', req.ip);
      
      if (req.user) {
        currentSpan.setAttribute('user.id', req.user.id);
      }
    }

    // Add response tracking
    const originalEnd = res.end;
    res.end = function(...args) {
      if (currentSpan) {
        currentSpan.setAttribute('http.status_code', res.statusCode);
        currentSpan.setAttribute('http.response_content_length', res.get('content-length'));
      }
      originalEnd.apply(res, args);
    };

    next();
  };
}

module.exports = telemetryMiddleware;