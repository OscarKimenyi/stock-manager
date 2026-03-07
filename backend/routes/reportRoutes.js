const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.get('/dashboard', reportController.getDashboardStats);
router.get('/current-stock', reportController.getCurrentStock);
router.get('/stock-in', reportController.getStockInReport);
router.get('/stock-out', reportController.getStockOutReport);
router.get('/supplier-purchases', reportController.getSupplierPurchaseReport);
router.get('/unpaid', reportController.getUnpaidReport);
router.get('/low-stock', reportController.getLowStockReport);

module.exports = router;