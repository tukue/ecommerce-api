const dotenv = require('dotenv');

dotenv.config();

const requiredVars = ['DATABASE_URL', 'JWT_SECRET'];
const MIN_JWT_SECRET_LENGTH = 32;

for (const key of requiredVars) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

if (process.env.NODE_ENV !== 'test' && process.env.JWT_SECRET.length < MIN_JWT_SECRET_LENGTH) {
  throw new Error(`JWT_SECRET must be at least ${MIN_JWT_SECRET_LENGTH} characters long`);
}

const authDomain = process.env.AUTH_DOMAIN || '';
const authAudience = process.env.AUTH_AUDIENCE || '';
const authIssuer = process.env.AUTH_ISSUER || (authDomain ? `https://${authDomain}/` : '');

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
  shutdownTimeoutMs: Number(process.env.SHUTDOWN_TIMEOUT_MS || 10000),
  auth: {
    domain: authDomain,
    audience: authAudience,
    issuer: authIssuer,
    clientId: process.env.AUTH_CLIENT_ID || '',
    clientSecret: process.env.AUTH_CLIENT_SECRET || '',
    enabled: Boolean(authDomain && authAudience),
    baseURL: process.env.AUTH_BASE_URL || `http://localhost:${process.env.PORT || 5004}`,
  },
};
