const { Sequelize } = require('sequelize');
const env = require('./env');
const logger = require('../utils/logger');

const poolConfig = {
  max: env.nodeEnv === 'production' ? 25 : 10,
  min: 2,
  idle: 30000,
  acquire: 30000,
  evict: 30000,
};

if (env.nodeEnv === 'production') {
  poolConfig.maxUses = 5000;
}

const sequelize = new Sequelize(env.databaseUrl, {
  dialect: 'postgres',
  protocol: 'postgres',
  logging: env.nodeEnv === 'development' ? (sql, timing) => logger.debug('sql_query', { sql, durationMs: timing }) : false,
  benchmark: true,
  pool: poolConfig,
  dialectOptions: {
    ssl: env.nodeEnv === 'production' ? { rejectUnauthorized: false } : false,
  },
});

async function checkDatabaseConnection() {
  await sequelize.authenticate();
}

module.exports = sequelize;
module.exports.checkDatabaseConnection = checkDatabaseConnection;
