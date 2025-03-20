# E-commerce API

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
git 
cd ecommerce-api


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
