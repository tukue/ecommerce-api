const { app, sequelize } = require('./app');
const env = require('./config/env');
const { checkDatabaseConnection } = require('./config/db');
const logger = require('./utils/logger');
const { startTracing, stopTracing } = require('./config/tracer');

let server;

async function startServer() {
  await startTracing();
  await checkDatabaseConnection();

  server = app.listen(env.port, '0.0.0.0', () => {
    logger.info('server_started', { port: env.port, environment: env.nodeEnv });
  });
}

async function shutdown(signal) {
  logger.info('shutdown_started', { signal });

  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }

  await sequelize.close();
  await stopTracing();
  logger.info('shutdown_completed');
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

startServer().catch((error) => {
  logger.error('server_start_failed', { error: error.message, stack: error.stack });
  process.exit(1);
});
