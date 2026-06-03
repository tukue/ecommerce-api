const express = require('express');
const productController = require('../controllers/productController');
const validate = require('../middleware/validate');
const { createProduct, updateProduct, searchProducts } = require('../utils/validators');
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleWare');

const router = express.Router();

router.post('/', authMiddleware, adminMiddleware, validate({ body: createProduct }), productController.createProduct);
router.get('/search', validate({ query: searchProducts }), productController.searchProductsByName);
router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProductById);
router.put('/:id', authMiddleware, adminMiddleware, validate({ body: updateProduct }), productController.updateProduct);
router.delete('/:id', authMiddleware, adminMiddleware, productController.deleteProduct);

module.exports = router;
