const dotenv = require('dotenv');

dotenv.config();

const requiredVars = ['DATABASE_URL', 'JWT_SECRET'];

for (const key of requiredVars) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 5004),
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
  stripePublicKey: process.env.STRIPE_PUBLIC_KEY || '',
  otelEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://jaeger:4318',
  serviceName: process.env.OTEL_SERVICE_NAME || 'ecommerce-api',
};
