const pool = require("../config/db");
const { validationResult } = require("express-validator");

const stockInController = {
  createStockIn: async (req, res) => {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const companyId = req.session.companyId;
      const {
        product_id,
        supplier_id,
        quantity,
        buying_price,
        amount_paid,
        payment_method,
        purchase_date,
        notes,
      } = req.body;

      const receipt_file = req.file
        ? `/uploads/receipts/${req.file.filename}`
        : null;

      // Insert stock in record with company_id
      const [result] = await connection.query(
        `INSERT INTO stock_in 
                (company_id, product_id, supplier_id, quantity, buying_price, amount_paid, 
                payment_method, receipt_file, purchase_date, notes) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          companyId,
          product_id,
          supplier_id,
          quantity,
          buying_price,
          amount_paid,
          payment_method,
          receipt_file,
          purchase_date,
          notes,
        ],
      );

      // Update product quantity (with company_id check)
      await connection.query(
        "UPDATE products SET quantity = quantity + ? WHERE id = ? AND company_id = ?",
        [quantity, product_id, companyId],
      );

      await connection.commit();

      const [newStockIn] = await connection.query(
        `SELECT si.*, p.product_name, s.supplier_name 
                FROM stock_in si
                JOIN products p ON si.product_id = p.id
                JOIN suppliers s ON si.supplier_id = s.id
                WHERE si.id = ? AND si.company_id = ?`,
        [result.insertId, companyId],
      );

      res.status(201).json(newStockIn[0]);
    } catch (error) {
      await connection.rollback();
      console.error("Create stock in error:", error);
      res.status(500).json({ error: "Server error" });
    } finally {
      connection.release();
    }
  },

  getAllStockIn: async (req, res) => {
    try {
      const companyId = req.session.companyId;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;

      const [transactions] = await pool.query(
        `SELECT si.*, p.product_name, s.supplier_name 
                FROM stock_in si
                JOIN products p ON si.product_id = p.id
                JOIN suppliers s ON si.supplier_id = s.id
                WHERE si.company_id = ?
                ORDER BY si.created_at DESC
                LIMIT ? OFFSET ?`,
        [companyId, limit, offset],
      );

      const [totalResult] = await pool.query(
        "SELECT COUNT(*) as total FROM stock_in WHERE company_id = ?",
        [companyId],
      );

      res.json({
        transactions,
        pagination: {
          page,
          limit,
          total: totalResult[0].total,
          pages: Math.ceil(totalResult[0].total / limit),
        },
      });
    } catch (error) {
      console.error("Get stock in error:", error);
      res.status(500).json({ error: "Server error" });
    }
  },

  getUnpaidBalances: async (req, res) => {
    try {
      const companyId = req.session.companyId;

      const [unpaid] = await pool.query(
        `SELECT si.*, p.product_name, s.supplier_name, s.phone as supplier_phone
                FROM stock_in si
                JOIN products p ON si.product_id = p.id
                JOIN suppliers s ON si.supplier_id = s.id
                WHERE si.company_id = ? AND si.balance > 0
                ORDER BY si.balance DESC`,
        [companyId],
      );

      res.json(unpaid);
    } catch (error) {
      console.error("Get unpaid balances error:", error);
      res.status(500).json({ error: "Server error" });
    }
  },

  // Add this method to stockInController
  getStockInById: async (req, res) => {
    try {
      const companyId = req.session.companyId;

      const [transactions] = await pool.query(
        `SELECT si.*, p.product_name, p.product_code, s.supplier_name 
            FROM stock_in si
            JOIN products p ON si.product_id = p.id
            JOIN suppliers s ON si.supplier_id = s.id
            WHERE si.id = ? AND si.company_id = ?`,
        [req.params.id, companyId],
      );

      if (transactions.length === 0) {
        return res.status(404).json({ error: "Transaction not found" });
      }

      res.json(transactions[0]);
    } catch (error) {
      console.error("Get stock in error:", error);
      res.status(500).json({ error: "Server error" });
    }
  },

  getTotalUnpaidBalance: async (req, res) => {
    try {
      const companyId = req.session.companyId;

      const [result] = await pool.query(
        "SELECT COALESCE(SUM(balance), 0) as total_unpaid FROM stock_in WHERE company_id = ? AND balance > 0",
        [companyId],
      );

      res.json({ total_unpaid: result[0].total_unpaid });
    } catch (error) {
      console.error("Get total unpaid error:", error);
      res.status(500).json({ error: "Server error" });
    }
  },
};

module.exports = stockInController;
