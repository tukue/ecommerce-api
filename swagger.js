const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const express = require('express');
const router = express.Router();

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'E-commerce API',
      version: '1.0.0',
      description:
        'This is an E-commerce API built with Node.js, Express, Sequelize, and PostgreSQL.',
    },
    servers: [
      {
        url: 'http://localhost:5004', // Update this to match your server URL
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT', // Optional, but recommended
        },
      },
    },
    security: [
      {
        bearerAuth: [], // Apply the bearerAuth security scheme globally
      },
    ],
  },
  apis: ['./routes/*.js', './controllers/*.js'], // Files containing Swagger annotations
};

const specs = swaggerJsdoc(options);

router.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

module.exports = router;
