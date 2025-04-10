
# E-commerce API

A RESTful API for an e-commerce platform built with Node.js.

## Project URL

https://github.com/tukue/ecommerce-api

## Features

- User authentication and authorization
- Product management
- Order processing
- Payment integration with Stripe
- Database integration with PostgreSQL

## Technologies Used

- Node.js
- Express.js
- PostgreSQL
- Stripe Payment Integration
- JWT Authentication

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
