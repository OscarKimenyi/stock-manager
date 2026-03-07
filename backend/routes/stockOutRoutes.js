const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const stockOutController = require('../controllers/stockOutController');
const authMiddleware = require('../middleware/auth');

const stockOutValidation = [
    body('product_id').isInt().withMessage('Valid product ID required'),
    body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('date').isDate().withMessage('Valid date required')
];

router.use(authMiddleware);

router.get('/', stockOutController.getAllStockOut);
router.post('/', stockOutValidation, stockOutController.createStockOut);

module.exports = router;