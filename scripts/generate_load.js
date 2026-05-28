const axios = require('axios');
const https = require('https');

// Configuration
const CONFIG = {
  BASE_URL: 'http://localhost:5004', // Docker mapped port
  ENDPOINTS: ['/test-metrics', '/test-cart', '/test-error', '/test-trace'],
  DELAY_MS: 2000,
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1000,
};

// Create axios instance with custom config
const client = axios.create({
  baseURL: CONFIG.BASE_URL,
  timeout: 5000,
  httpsAgent: new https.Agent({ keepAlive: true }),
  maxRetries: CONFIG.MAX_RETRIES,
  validateStatus: function (status) {
    return status >= 200 && status < 600; // Consider all responses valid for metrics
  },
});

// Add retry interceptor
client.interceptors.response.use(undefined, async (err) => {
  const { config } = err;
  if (!config || !config.retry) {
    return Promise.reject(err);
  }
  config.retry -= 1;
  if (config.retry === 0) {
    return Promise.reject(err);
  }
  await new Promise((resolve) => setTimeout(resolve, CONFIG.RETRY_DELAY_MS));
  return client(config);
});

// Stats tracking
let stats = {
  requests: 0,
  success: 0,
  errors: 0,
  lastPrint: Date.now(),
};

function printStats() {
  const now = Date.now();
  const duration = (now - stats.lastPrint) / 1000;
  const rps = Math.round(stats.requests / duration);

  console.log('\n=== Load Generator Stats ===');
  console.log(`Requests: ${stats.requests} (${rps} req/sec)`);
  console.log(`Successes: ${stats.success}`);
  console.log(`Errors: ${stats.errors}`);
  console.log('==========================\n');

  // Reset stats
  stats = {
    requests: 0,
    success: 0,
    errors: 0,
    lastPrint: now,
  };
}

async function makeRequest() {
  const endpoint = CONFIG.ENDPOINTS[Math.floor(Math.random() * CONFIG.ENDPOINTS.length)];
  const url = `${endpoint}`;

  try {
    stats.requests++;
    const response = await client.get(url, {
      retry: CONFIG.MAX_RETRIES,
    });

    stats.success++;
    console.log(`✅ ${endpoint} - ${response.status}`);
  } catch (error) {
    stats.errors++;
    console.log(`❌ ${endpoint} - ${error.message}`);

    if (error.response) {
      console.log(`Response error (${error.response.status}):`, error.response.data);
    } else if (error.request) {
      console.log('No response received:', error.message);
    } else {
      console.log('Request error:', error.message);
    }
  }
}

async function generateLoad() {
  // Print stats every 10 seconds
  setInterval(printStats, 10000);

  while (true) {
    try {
      await makeRequest();
      await new Promise((resolve) => setTimeout(resolve, CONFIG.DELAY_MS));
    } catch (error) {
      console.error('Critical error in load generation:', error);
      await new Promise((resolve) => setTimeout(resolve, CONFIG.DELAY_MS * 2));
    }
  }
}

// Test connection before starting load generation
async function testConnection() {
  console.log(`Testing connection to ${CONFIG.BASE_URL}...`);

  try {
    await client.get('/test-metrics');
    console.log('✅ Connection test successful');
    return true;
  } catch (error) {
    console.log('❌ Connection test failed:', error.message);
    return false;
  }
}

// Main execution
async function main() {
  console.log('Starting load generator...');

  // Retry connection test up to 3 times
  for (let i = 0; i < 3; i++) {
    if (await testConnection()) {
      console.log(`\nStarting load generation against ${CONFIG.BASE_URL}`);
      console.log('Press Ctrl+C to stop\n');
      generateLoad();
      return;
    }
    console.log(`Retrying connection test in ${CONFIG.RETRY_DELAY_MS}ms...`);
    await new Promise((resolve) => setTimeout(resolve, CONFIG.RETRY_DELAY_MS));
  }

  console.error('Failed to establish connection after 3 attempts. Exiting.');
  process.exit(1);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nGracefully shutting down...');
  printStats();
  process.exit(0);
});

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
