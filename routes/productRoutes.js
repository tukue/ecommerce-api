const express = require('express');
const productController = require('../controllers/productController');
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleWare');

const router = express.Router();

router.post('/', authMiddleware, adminMiddleware, productController.createProduct);
router.get('/search', productController.searchProductsByName);
router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProductById);
router.put('/:id', authMiddleware, adminMiddleware, productController.updateProduct);
router.delete('/:id', authMiddleware, adminMiddleware, productController.deleteProduct);

module.exports = router;
