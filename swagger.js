const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const express = require('express');
const router = express.Router();
const authController = require('./controllers/authController'); // Import the authController

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

/**
 * @swagger
 * /api/auth/request-reset:
 *   post:
 *     summary: Request password reset
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Reset token generated
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.post('/request-reset', authController.requestPasswordReset);

module.exports = router;
