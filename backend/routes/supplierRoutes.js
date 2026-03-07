const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const supplierController = require('../controllers/supplierController');
const authMiddleware = require('../middleware/auth');

const supplierValidation = [
    body('supplier_name').notEmpty().withMessage('Supplier name is required'),
    body('email').optional().isEmail().withMessage('Invalid email format'),
    body('phone').optional()
];

router.use(authMiddleware);

router.get('/', supplierController.getAllSuppliers);
router.get('/:id', supplierController.getSupplier);
router.get('/:id/history', supplierController.getPurchaseHistory);
router.post('/', supplierValidation, supplierController.createSupplier);
router.put('/:id', supplierValidation, supplierController.updateSupplier);
router.delete('/:id', supplierController.deleteSupplier);

module.exports = router;