const express = require('express');
const { checkDatabaseConnection } = require('../config/db');

const router = express.Router();

router.get('/live', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'ecommerce-api',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

router.get('/ready', async (req, res) => {
  try {
    await checkDatabaseConnection();
    res.status(200).json({
      status: 'ready',
      checks: {
        database: 'up',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'degraded',
      checks: {
        database: 'down',
      },
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

module.exports = router;
