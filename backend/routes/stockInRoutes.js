const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const stockInController = require('../controllers/stockInController');
const authMiddleware = require('../middleware/auth');
const upload = require('../middleware/upload');

const stockInValidation = [
    body('product_id').isInt().withMessage('Product ID must be a valid number'),
    body('supplier_id').isInt().withMessage('Supplier ID must be a valid number'),
    body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('buying_price').isFloat({ min: 0.01 }).withMessage('Buying price must be greater than 0'),
    body('amount_paid').isFloat({ min: 0 }).withMessage('Amount paid must be 0 or greater'),
    body('payment_method').isIn(['Cash', 'Bank', 'Mobile Money']).withMessage('Invalid payment method'),
    body('purchase_date').isDate().withMessage('Valid purchase date required')
];

router.use(authMiddleware);

router.get('/', stockInController.getAllStockIn);
router.get('/unpaid', stockInController.getUnpaidBalances);
router.get('/unpaid/total', stockInController.getTotalUnpaidBalance);
router.get('/:id', stockInController.getStockInById);
router.post('/', upload.single('receipt'), stockInValidation, stockInController.createStockIn);

module.exports = router;