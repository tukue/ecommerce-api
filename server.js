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
const { register, httpRequestDuration } = require('./config/metrics');

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

// Metrics middleware
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        httpRequestDuration
            .labels(req.method, req.path, res.statusCode)
            .observe(duration / 1000);
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

// Sync the models with the database
sequelize.sync({ alter: true }).then(() => {
  const PORT = process.env.PORT || 5004;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Unable to sync the database:', err);
});

