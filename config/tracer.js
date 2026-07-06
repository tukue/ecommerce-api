const opentelemetry = require('@opentelemetry/sdk-node');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { ExpressInstrumentation } = require('@opentelemetry/instrumentation-express');
const { PgInstrumentation } = require('@opentelemetry/instrumentation-pg');
const { trace } = require('@opentelemetry/api');
const env = require('./env');
const logger = require('../utils/logger');

const traceExporter = new OTLPTraceExporter({
  url: `${env.otelEndpoint}/v1/traces`,
  timeoutMillis: 5000,
});

const sdk = new opentelemetry.NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: env.serviceName,
    [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: env.nodeEnv,
  }),
  traceExporter,
  instrumentations: [
    getNodeAutoInstrumentations(),
    new ExpressInstrumentation(),
    new PgInstrumentation({
      enhancedDatabaseReporting: env.nodeEnv === 'development',
    }),
  ],
});

const tracer = trace.getTracer(env.serviceName);

async function startTracing() {
  await sdk.start();
  logger.info('tracing_started', { endpoint: env.otelEndpoint });
}

async function stopTracing() {
  await sdk.shutdown();
  logger.info('tracing_stopped');
}

function startSpan(name, attributes = {}) {
  return tracer.startActiveSpan(name, { attributes });
}

module.exports = {
  startTracing,
  stopTracing,
  tracer,
  startSpan,
};
