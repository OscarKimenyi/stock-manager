// backend/routes/paymentRoutes.js
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const paymentController = require('../controllers/paymentController');
const authMiddleware = require('../middleware/auth');

const paymentValidation = [
    body('stock_in_id').isInt().withMessage('Valid stock in ID required'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
    body('payment_method').isIn(['Cash', 'Bank', 'Mobile Money']).withMessage('Invalid payment method'),
    body('payment_date').isDate().withMessage('Valid date required')
];

router.use(authMiddleware);

router.post('/', paymentValidation, paymentController.makePayment);
router.get('/history/:stock_in_id', paymentController.getPaymentHistory);
router.get('/supplier/:supplier_id', paymentController.getSupplierPayments);

module.exports = router;