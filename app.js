const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const { DataTypes } = require('sequelize');

const sequelize = require('./config/db');
const { register } = require('./config/metrics');
const requestContext = require('./middleware/requestContext');
const requestLogger = require('./middleware/requestLogger');
const telemetryMiddleware = require('./middleware/telemetry');
const metricsMiddleware = require('./middleware/metricsMiddleware');
const timeoutMiddleware = require('./middleware/timeout');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const { apiLimiter, mutatingApiLimiter } = require('./middleware/authMiddleWare');

const { auth } = require('express-openid-connect');
const env = require('./config/env');

const orderRoutes = require('./routes/orderRoutes');
const productRoutes = require('./routes/productRoutes');
const authRoutes = require('./routes/authRoutes');
const checkoutRoutes = require('./routes/checkoutRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const healthRoutes = require('./routes/healthRoutes');
const swaggerRoutes = require('./swagger');

const User = require('./models/user')(sequelize, DataTypes);
const Product = require('./models/product')(sequelize, DataTypes);
const Payment = require('./models/payment')(sequelize, DataTypes);
const Order = require('./models/order')(sequelize, DataTypes);

User.associate({ Order, Payment });
Order.associate({ User, Product, Payment });
Payment.associate({ User, Order });
Product.associate({ Order });

const app = express();

app.use(compression());
app.use(cors());
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", 'https://js.stripe.com'],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        frameSrc: ["'self'", 'https://js.stripe.com', 'https://hooks.stripe.com'],
      },
    },
  }),
);
app.use(express.json());
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', `${__dirname}/views`);

app.use(requestContext);
app.use(requestLogger);
app.use(telemetryMiddleware());
app.use(metricsMiddleware());
app.use(timeoutMiddleware(30000));

if (env.auth && env.auth.enabled) {
  const authProvider = require('./services/authProvider');
  authProvider.init(env.auth.issuer);
}

if (env.auth && env.auth.enabled && env.auth.clientId && env.auth.clientSecret) {
  app.use(
    auth({
      authRequired: false,
      baseURL: env.auth.baseURL,
      clientID: env.auth.clientId,
      secret: env.auth.clientSecret,
      issuerBaseURL: env.auth.issuer,
      routes: {
        login: '/login',
        logout: '/logout',
        callback: '/callback',
      },
    }),
  );
}

app.use((req, res, next) => {
  req.models = { User, Product, Payment, Order };
  next();
});

app.get('/metrics', async (req, res) => {
  res.setHeader('Content-Type', register.contentType);
  res.send(await register.metrics());
});

app.get('/login', (req, res) => res.render('login', { message: 'Please log in' }));
app.get('/', (req, res) => res.render('index', { message: 'Welcome to the E-commerce API' }));
app.get('/cart', (req, res) =>
  res.render('cart', { stripePublicKey: process.env.STRIPE_PUBLIC_KEY }),
);

app.use('/health', healthRoutes);
app.use('/api', apiLimiter);
app.use('/api', mutatingApiLimiter);
app.use('/api', orderRoutes);
app.use('/api/products', productRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/', swaggerRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = {
  app,
  sequelize,
};
