const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const sequelize = require('./config/db'); // Import your sequelize instance
const orderRoutes = require('./routes/OrderRoutes');
const productRoutes = require('./routes/productRoutes');   
const authRoutes = require('./routes/authRoutes');  
const swaggerRoutes = require('./swagger');
const User = require('./models/user')(sequelize, require('sequelize').DataTypes);
const Product = require('./models/product')(sequelize, require('sequelize').DataTypes);

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
  req.models = { User, Product };
  next();
});

app.get('/', (req, res) => {
  res.render('index', { message: 'Welcome to the E-commerce API' });
});

// Define the /products route
app.get('/products', async (req, res) => {
  try {
    const products = await req.models.Product.findAll();
    res.render('products', { products }); // Render the products.ejs template
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Define the /profile route
app.get('/profile', async (req, res) => {
  try {
    const user = await req.models.User.findByPk(req.user.userId);
    res.render('profile', { user });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.use('/api', orderRoutes);
app.use('/api/products', productRoutes);
app.use('/api/auth', authRoutes);
app.use('/', swaggerRoutes);  

const PORT = process.env.PORT || 5004;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});