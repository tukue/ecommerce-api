const promClient = require('prom-client');

const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5, 10],
  registers: [register],
});

const httpRequestTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

const inFlightRequests = new promClient.Gauge({
  name: 'http_in_flight_requests',
  help: 'Current in-flight HTTP requests',
  registers: [register],
});

const apiErrorTotal = new promClient.Counter({
  name: 'api_errors_total',
  help: 'Total number of API errors',
  labelNames: ['route', 'method', 'status_code'],
  registers: [register],
});

const dbQueryDuration = new promClient.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'model'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
  registers: [register],
});

const dbQueryTotal = new promClient.Counter({
  name: 'db_queries_total',
  help: 'Total number of database queries',
  labelNames: ['operation', 'model'],
  registers: [register],
});

const activeUsers = new promClient.Gauge({
  name: 'active_users',
  help: 'Number of active users',
  registers: [register],
});

const orderTotal = new promClient.Counter({
  name: 'order_total',
  help: 'Total number of orders placed',
  registers: [register],
});

const stripeRequestTotal = new promClient.Counter({
  name: 'stripe_requests_total',
  help: 'Total number of Stripe API requests',
  labelNames: ['operation', 'status'],
  registers: [register],
});

const externalAuthRequestDuration = new promClient.Histogram({
  name: 'external_auth_request_duration_seconds',
  help: 'Duration of external auth verification requests',
  labelNames: ['operation'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  registers: [register],
});

module.exports = {
  register,
  httpRequestDuration,
  httpRequestTotal,
  inFlightRequests,
  apiErrorTotal,
  dbQueryDuration,
  dbQueryTotal,
  activeUsers,
  orderTotal,
  stripeRequestTotal,
  externalAuthRequestDuration,
};
