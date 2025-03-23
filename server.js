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
const User = require('./models/user')(sequelize, require('sequelize').DataTypes);
const Product = require('./models/product')(sequelize, require('sequelize').DataTypes);
const Payment = require('./models/payment')(sequelize, require('sequelize').DataTypes); // Import the Payment model
const Order = require('./models/order')(sequelize, require('sequelize').DataTypes); // Import the Order model
const authMiddleware = require('./middleware/authMiddleWare'); // Import the auth middleware

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

// Define the /products route
app.get('/products', async (req, res) => {
  try {
    const products = await req.models.Product.findAll();
    res.json(products); // Return JSON data
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Define the /profile route
app.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await req.models.User.findByPk(req.user.userId);
    res.render('profile', { user });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Define the /cart route
app.get('/cart', (req, res) => {
  res.render('cart', { stripePublicKey: process.env.STRIPE_PUBLIC_KEY });
});

// Define the /success route
app.get('/success', (req, res) => {
  res.render('success');
});

// Define the /login route
app.get('/login', (req, res) => {
  res.render('login');
});

app.use('/api', orderRoutes);
app.use('/api/products', productRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/checkout', checkoutRoutes); // Use the checkout routes
app.use('/api/payments', paymentRoutes); // Use the payment routes
app.use('/', swaggerRoutes);  

// Sync the models with the database
sequelize.sync().then(() => {
  const PORT = process.env.PORT || 5004;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Unable to sync the database:', err);
});