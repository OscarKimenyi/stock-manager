const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const productController = require('../controllers/productController');
const authMiddleware = require('../middleware/auth');

// Validation rules
const productValidation = [
    body('product_name').notEmpty().withMessage('Product name is required'),
    body('product_code').notEmpty().withMessage('Product code is required'),
    body('unit_type').isIn(['Piece', 'Roll', 'Bundle', 'Kg']).withMessage('Invalid unit type')
];

// Apply auth middleware to all routes
router.use(authMiddleware);

router.get('/', productController.getAllProducts);
router.get('/low-stock', productController.getLowStockProducts);
router.get('/:id', productController.getProduct);
router.post('/', productValidation, productController.createProduct);
router.put('/:id', productValidation, productController.updateProduct);
router.delete('/:id', productController.deleteProduct);

module.exports = router;