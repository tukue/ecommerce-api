const express = require('express');
const productController = require('../controllers/productController');

const router = express.Router();

router.post('/', productController.createProduct);
router.get('/search', productController.searchProductsByName);
router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProductById);
router.put('/:id', productController.updateProduct);
router.delete('/:id', productController.deleteProduct);

module.exports = router;
