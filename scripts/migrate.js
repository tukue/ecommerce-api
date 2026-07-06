const fs = require('fs');
const path = require('path');
const { Sequelize } = require('sequelize');

const sequelize = require('../config/db');
const logger = require('../utils/logger');

const migrationsDir = path.join(__dirname, '..', 'migrations');
const metaTable = 'schema_migrations';

async function ensureMetaTable(queryInterface) {
  await queryInterface.createTable(metaTable, {
    name: {
      type: Sequelize.STRING,
      allowNull: false,
      primaryKey: true,
    },
    applied_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    },
  });
}

async function getAppliedMigrations() {
  const tableName = sequelize.getQueryInterface().quoteTable(metaTable);
  const [rows] = await sequelize.query(`SELECT name FROM ${tableName} ORDER BY name`);
  return new Set(rows.map((row) => row.name));
}

async function tableExists(queryInterface, tableName) {
  const tables = await queryInterface.showAllTables();
  return tables.map((table) => (typeof table === 'object' ? table.tableName : table)).includes(tableName);
}

async function run() {
  const queryInterface = sequelize.getQueryInterface();
  await sequelize.authenticate();

  if (!(await tableExists(queryInterface, metaTable))) {
    await ensureMetaTable(queryInterface);
  }

  const applied = await getAppliedMigrations();
  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.js'))
    .sort();

  for (const file of migrationFiles) {
    if (applied.has(file)) {
      continue;
    }

    const migration = require(path.join(migrationsDir, file));
    await sequelize.transaction(async (transaction) => {
      await migration.up(queryInterface, Sequelize, { transaction });
      await queryInterface.bulkInsert(metaTable, [{ name: file }], { transaction });
    });
    logger.info('migration_applied', { migration: file });
  }

  logger.info('migrations_completed', { appliedCount: migrationFiles.length });
}

run()
  .catch((error) => {
    logger.error('migrations_failed', { error: error.message, stack: error.stack });
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });
