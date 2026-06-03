require('dotenv').config();

module.exports = {
  development: {
    url: process.env.DATABASE_URL,
    dialect: 'postgres',
    logging: true,
  },
  test: {
    url: process.env.DATABASE_URL || 'sqlite::memory:',
    dialect: 'sqlite',
    logging: false,
  },
  production: {
    url: process.env.DATABASE_URL,
    dialect: 'postgres',
    logging: false,
    pool: {
      max: 10,
      min: 1,
      idle: 10000,
      acquire: 30000,
    },
  },
};
