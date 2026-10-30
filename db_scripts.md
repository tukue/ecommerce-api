CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
); 

CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL,
    stock INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
); 
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL,
    total_price NUMERIC(10, 2) NOT NULL,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    order_id INTEGER NOT NULL REFERENCES orders(id),
    amount NUMERIC(10, 2) NOT NULL,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


diagrammatic representation of the database 






    +----------------+          +----------------+          +----------------+
|     Users      |          |    Products    |          |    Payments    |
+----------------+          +----------------+          +----------------+
| id (PK)        |          | id (PK)        |          | id (PK)        |
| username       |          | name           |          | userId (FK)    |
| email          |          | description    |          | orderId (FK)   |
| password       |          | price          |          | amount         |
| createdAt      |          | stock          |          | status         |
| updatedAt      |          | createdAt      |          | createdAt      |
+----------------+          | updatedAt      |          | updatedAt      |
                            +----------------+          +----------------+
                                   ^                            ^
                                   |                            |
                                   |                            |
                                   +----------------+-----------+
                                                    |
                                                    |
                                             +----------------+
                                             |     Orders      |
                                             +----------------+
                                             | id (PK)        |
                                             | userId (FK)    |
                                             | productId (FK) |
                                             | quantity       |
                                             | total_price    |
                                             | status         |
                                             | createdAt      |
                                             | updatedAt      |
                                             +----------------+

    GitHub Copilot
Here’s a diagrammatic representation of the database associations for your E-commerce API:

Database Associations Diagram
Ex                                         
User ↔ Order:

One-to-Many Relationship:
A user can place multiple orders.
Each order belongs to a single user.
Implementation:
User.hasMany(Order, { foreignKey: 'userId', as: 'orders' })
Order.belongsTo(User, { foreignKey: 'userId', as: 'user' })
Product ↔ Order:

One-to-Many Relationship:
A product can be part of multiple orders.
Each order references a single product.
Implementation:
Product.hasMany(Order, { foreignKey: 'productId', as: 'orders' })
Order.belongsTo(Product, { foreignKey: 'productId', as: 'product' })
Order ↔ Payment:

One-to-One Relationship:
Each order can have one payment.
Each payment references a single order.
Implementation:
Order.hasOne(Payment, { foreignKey: 'orderId', as: 'payment' })
Payment.belongsTo(Order, { foreignKey: 'orderId', as: 'order' })
User ↔ Payment:

One-to-Many Relationship:
A user can make multiple payments.
Each payment references a single user.
Implementation:
User.hasMany(Payment, { foreignKey: 'userId', as: 'payments' })
Payment.belongsTo(User, { foreignKey: 'userId', as: 'user' }) ¨


Summary of Relationships
User ↔ Order:

A user can place multiple orders.
User.hasMany(Order) and Order.belongsTo(User).
User ↔ Payment:

A user can make multiple payments.
User.hasMany(Payment) and Payment.belongsTo(User).
Order ↔ Payment:

Each order can have one payment.
Order.hasOne(Payment) and Payment.belongsTo(Order).
Product ↔ Order:

A product can be part of multiple orders.
Product.hasMany(Order) and Order.belongsTo(Product).