# E-commerce API

This is an E-commerce API built with Node.js, Express, Sequelize, and PostgreSQL. It provides endpoints for user authentication, product management, and order management.

## Features

- User registration and login with JWT authentication
- Product management (CRUD operations)
- Order management (CRUD operations)
- Payment processing with Stripe
- Middleware for authentication
- Database associations between users, products, orders, and payments

## Database Associations

The database schema includes the following associations:

1. **User ↔ Order**:
   - A user can have many orders.
   - Each order belongs to a single user.
   - **Association**: `User.hasMany(Order)` and `Order.belongsTo(User)`

2. **Product ↔ Order**:
   - A product can be part of many orders.
   - Each order references a single product.
   - **Association**: `Product.hasMany(Order)` and `Order.belongsTo(Product)`

3. **Order ↔ Payment**:
   - Each order can have one payment.
   - Each payment references a single order.
   - **Association**: `Order.hasOne(Payment)` and `Payment.belongsTo(Order)`

4. **User ↔ Payment**:
   - A user can make many payments.
   - Each payment references a single user.
   - **Association**: `User.hasMany(Payment)` and `Payment.belongsTo(User)`

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- PostgreSQL

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-repo/ecommerce-api.git
   cd ecommerce-api# E-commerce API

This is an E-commerce API built with Node.js, Express, Sequelize, and PostgreSQL. It provides endpoints for user authentication, product management, and order management.

## Features

- User registration and login with JWT authentication
- Product management (CRUD operations)
- Order management (CRUD operations)
- Middleware for authentication

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- PostgreSQL

### Installation

1. Clone the repository:
git clone https://github.com/tukue/ecommerce-api
cd ecommerce-api

project URL: https://github.com/tukue/ecommerce-api

APIs :
Authentication
Register: POST /api/auth/register
Login: POST /api/auth/login
Get Profile: GET /api/auth/profile

Products
Create Product: POST /api/products
Get All Products: GET /api/products
Get Product by ID: GET /api/products/:id
Update Product: PUT /api/products/:id

Orders
Create Order: POST /api/orders
Get All Orders: GET /api/orders
Get Order by ID: GET /api/orders/:id
Update Order: PUT /api/orders/:id
