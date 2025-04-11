const promClient = require('prom-client');

// Create a Registry
const register = new promClient.Registry();

// Enable the collection of default metrics
promClient.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new promClient.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

const orderTotal = new promClient.Counter({
    name: 'order_total',
    help: 'Total number of orders'
});

const productViews = new promClient.Counter({
    name: 'product_views_total',
    help: 'Total number of product views',
    labelNames: ['product_id']
});

const activeUsers = new promClient.Gauge({
    name: 'active_users',
    help: 'Number of active users'
});

register.registerMetric(httpRequestDuration);
register.registerMetric(orderTotal);
register.registerMetric(productViews);
register.registerMetric(activeUsers);

module.exports = {
    register,
    httpRequestDuration,
    orderTotal,
    productViews,
    activeUsers
};