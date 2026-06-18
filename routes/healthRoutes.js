const express = require('express');
const { checkDatabaseConnection } = require('../config/db');

const router = express.Router();

async function checkStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    return { status: 'not_configured' };
  }
  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    await stripe.balance.retrieve();
    return { status: 'up' };
  } catch {
    return { status: 'degraded', error: 'Stripe API unreachable' };
  }
}

async function checkExternalAuth() {
  const domain = process.env.AUTH_DOMAIN;
  if (!domain) {
    return { status: 'not_configured' };
  }
  try {
    const response = await fetch(`https://${domain}/.well-known/openid-configuration`, {
      signal: AbortSignal.timeout(3000),
    });
    return { status: response.ok ? 'up' : 'degraded' };
  } catch {
    return { status: 'degraded', error: 'Auth provider unreachable' };
  }
}

router.get('/live', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'ecommerce-api',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

router.get('/ready', async (req, res) => {
  const checks = {};

  try {
    await checkDatabaseConnection();
    checks.database = 'up';
  } catch {
    checks.database = 'down';
  }

  const overallStatus = checks.database === 'down' ? 'degraded' : 'ready';

  res.status(overallStatus === 'ready' ? 200 : 503).json({
    status: overallStatus,
    checks,
    timestamp: new Date().toISOString(),
  });
});

router.get('/detailed', async (req, res) => {
  const [dbResult, stripeResult, authResult] = await Promise.allSettled([
    checkDatabaseConnection()
      .then(() => 'up')
      .catch(() => 'down'),
    checkStripe(),
    checkExternalAuth(),
  ]);

  const checks = {
    database: dbResult.status === 'fulfilled' ? dbResult.value : 'error',
    stripe: stripeResult.status === 'fulfilled' ? stripeResult.value : { status: 'error' },
    externalAuth: authResult.status === 'fulfilled' ? authResult.value : { status: 'error' },
  };

  const allUp =
    checks.database === 'up' &&
    checks.stripe.status !== 'error' &&
    checks.externalAuth.status !== 'error';

  res.status(allUp ? 200 : 503).json({
    status: allUp ? 'healthy' : 'degraded',
    checks,
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
