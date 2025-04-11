require('./config/tracer');

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const sequelize = require('./config/db'); // Import your sequelize instance
const orderRoutes = require('./routes/OrderRoutes');
const productRoutes = require('./routes/productRoutes');   
const authRoutes = require('./routes/authRoutes');  
const checkoutRoutes = require('./routes/checkoutRoutes'); // Import the checkout routes
const paymentRoutes = require('./routes/paymentRoutes'); // Import the payment routes
const swaggerRoutes = require('./swagger');
const { DataTypes } = require('sequelize');
const { register, httpRequestDuration, apiCallCounter } = require('./config/metrics');
const telemetryMiddleware = require('./middleware/telemetry');
const { trace } = require('@opentelemetry/api');

// Initialize models
const User = require('./models/user')(sequelize, DataTypes);
const Product = require('./models/product')(sequelize, DataTypes);
const Payment = require('./models/payment')(sequelize, DataTypes);
const Order = require('./models/order')(sequelize, DataTypes);

// Pass all models to their associate methods
User.associate({ Order, Payment });
Order.associate({ User, Product, Payment });
Payment.associate({ User, Order });
Product.associate({ Order });

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(telemetryMiddleware());

// Metrics middleware
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        const labels = {
            method: req.method,
            route: req.route ? req.route.path : req.path,
            status_code: res.statusCode
        };
        
        httpRequestDuration.labels(labels.method, labels.route, labels.status_code)
            .observe(duration / 1000);
        
        httpRequestTotal.labels(labels.method, labels.route, labels.status_code)
            .inc();
    });
    next();
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
    res.setHeader('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.send(metrics);
});

// Serve static assets from the public folder
app.use(express.static('public'));

app.get('/login', (req, res) => {
  res.render('login', { message: 'Please log in' });
});app.set('view engine', 'ejs');

// Set views directory
app.set('views', __dirname + '/views');

// Middleware to attach models to request object
app.use((req, res, next) => {
  req.models = { User, Product, Payment, Order };
  next();
});

app.get('/', (req, res) => {
  res.render('index', { message: 'Welcome to the E-commerce API' });
});

app.get('/cart', (req, res) => {
  res.render('cart', { stripePublicKey: process.env.STRIPE_PUBLIC_KEY });
});

// Define routes
app.use('/api', orderRoutes);
app.use('/api/products', productRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/', swaggerRoutes);  

// Add this after your other routes
app.get('/test-trace', async (req, res) => {
  const tracer = trace.getTracer('test-tracer');
  
  await tracer.startActiveSpan('test-operation', async (span) => {
    try {
      // Simulate some work
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Add some attributes to the span
      span.setAttribute('test.attribute', 'test-value');
      
      res.json({ message: 'Test trace created' });
    } catch (error) {
      span.recordException(error);
      span.setStatus({ code: opentelemetry.SpanStatusCode.ERROR });
      res.status(500).json({ error: error.message });
    } finally {
      span.end();
    }
  });
});

// Add these test endpoints after your other routes
app.get('/test-metrics', async (req, res) => {
  // Simulate HTTP requests
  const randomDuration = Math.random() * 1000;
  await new Promise(resolve => setTimeout(resolve, randomDuration));
  
  // Increment custom metrics
  http_request_duration_seconds.observe(randomDuration / 1000);
  http_requests_total.inc({ method: 'GET', route: '/test-metrics' });
  active_users.set(Math.floor(Math.random() * 100));
  order_total.inc();
  
  res.json({ message: 'Test metrics generated' });
});

app.get('/test-cart', async (req, res) => {
  // Simulate cart operations
  const operations = ['add', 'remove', 'update'];
  const operation = operations[Math.floor(Math.random() * operations.length)];
  
  cart_operations_total.inc({ operation });
  
  if (Math.random() > 0.7) {
    checkout_total.inc();
  }
  
  res.json({ message: 'Cart metrics generated' });
});

app.get('/test-error', async (req, res) => {
  // Simulate errors
  traces_error_total.inc();
  res.status(500).json({ error: 'Test error' });
});

// Sync the models with the database
sequelize.sync({ alter: true }).then(() => {
  const PORT = process.env.PORT || 5004;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Unable to sync the database:', err);
});








