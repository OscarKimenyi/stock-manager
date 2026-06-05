// backend/routes/stockInRoutes.js
const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const stockInController = require("../controllers/stockInController");
const authMiddleware = require("../middleware/auth");
const upload = require("../middleware/upload");

const stockInValidation = [
  body("product_id").isInt().withMessage("Valid product ID required"),
  body("supplier_id").isInt().withMessage("Valid supplier ID required"),
  body("quantity").isInt({ min: 1 }).withMessage("Quantity must be at least 1"),
  body("buying_price")
    .isFloat({ min: 0.01 })
    .withMessage("Valid buying price required"),
  body("amount_paid")
    .isFloat({ min: 0 })
    .withMessage("Valid amount paid required"),
  body("payment_method")
    .isIn(["Cash", "Bank", "Mobile Money"])
    .withMessage("Invalid payment method"),
  body("purchase_date").isDate().withMessage("Valid date required"),
];

router.use(authMiddleware);

router.get("/", stockInController.getAllStockIn);
router.get("/unpaid", stockInController.getUnpaidBalances);
router.get("/unpaid/total", stockInController.getTotalUnpaidBalance);
router.get("/:id", stockInController.getStockInById);
router.post(
  "/",
  upload.single("receipt"),
  stockInValidation,
  stockInController.createStockIn,
);

module.exports = router;
