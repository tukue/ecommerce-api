const promClient = require('prom-client');
const { Histogram } = require('prom-client');

// Create a Registry
const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

// Existing metrics
const httpRequestDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.1, 0.3, 0.5, 1, 3, 5] // Define buckets for request duration
});

// New metrics
const httpRequestTotal = new promClient.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code']
});

const cartOperationsTotal = new promClient.Counter({
    name: 'cart_operations_total',
    help: 'Total number of cart operations',
    labelNames: ['operation']
});

const activeUsers = new promClient.Gauge({
    name: 'active_users',
    help: 'Number of active users'
});

register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(cartOperationsTotal);
register.registerMetric(checkoutTotal);

module.exports = {
    register,
    httpRequestDuration,
    httpRequestTotal,
    cartOperationsTotal,
    checkoutTotal
};

