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

// Initialize models
const User = require('./models/user')(sequelize, DataTypes);
const Product = require('./models/product')(sequelize, DataTypes);
const Payment = require('./models/payment')(sequelize, DataTypes);
const Order = require('./models/order')(sequelize, DataTypes);

// Define associations
User.associate({ Order });
Order.associate({ User, Product });
Product.associate({ Order });

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Serve static assets from the public folder
app.use(express.static('public'));

// Set EJS as the view engine
app.set('view engine', 'ejs');

// Define the directory for EJS templates
app.set('views', __dirname + '/views');

// Middleware to attach models to request object
app.use((req, res, next) => {
  req.models = { User, Product, Payment, Order };
  next();
});

app.get('/', (req, res) => {
  res.render('index', { message: 'Welcome to the E-commerce API' });
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