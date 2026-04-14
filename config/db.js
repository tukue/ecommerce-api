const { Sequelize } = require('sequelize');
const env = require('./env');
const logger = require('../utils/logger');

const sequelize = new Sequelize(env.databaseUrl, {
  dialect: 'postgres',
  protocol: 'postgres',
  logging: env.nodeEnv === 'development' ? (sql) => logger.info('sql_query', { sql }) : false,
  pool: {
    max: 10,
    min: 1,
    idle: 10000,
    acquire: 30000,
  },
});

async function checkDatabaseConnection() {
  await sequelize.authenticate();
}

module.exports = sequelize;
module.exports.checkDatabaseConnection = checkDatabaseConnection;
