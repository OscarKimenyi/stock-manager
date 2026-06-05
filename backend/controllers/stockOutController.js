const pool = require("../config/db");
const { validationResult } = require("express-validator");

const stockOutController = {
  createStockOut: async (req, res) => {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const companyId = req.session.companyId;
      const { product_id, quantity, date, notes } = req.body;

      // Check current stock with company_id
      const [products] = await connection.query(
        "SELECT quantity FROM products WHERE id = ? AND company_id = ?",
        [product_id, companyId],
      );

      if (products.length === 0) {
        await connection.rollback();
        return res.status(404).json({ error: "Product not found" });
      }

      const currentQuantity = products[0].quantity;

      if (currentQuantity < quantity) {
        await connection.rollback();
        return res.status(400).json({
          error: "Insufficient stock",
          available: currentQuantity,
          requested: quantity,
        });
      }

      // Insert stock out record with company_id
      const [result] = await connection.query(
        "INSERT INTO stock_out (company_id, product_id, quantity, date, notes) VALUES (?, ?, ?, ?, ?)",
        [companyId, product_id, quantity, date, notes],
      );

      // Update product quantity
      await connection.query(
        "UPDATE products SET quantity = quantity - ? WHERE id = ? AND company_id = ?",
        [quantity, product_id, companyId],
      );

      await connection.commit();

      const [newStockOut] = await connection.query(
        `SELECT so.*, p.product_name, p.product_code
                FROM stock_out so
                JOIN products p ON so.product_id = p.id
                WHERE so.id = ? AND so.company_id = ?`,
        [result.insertId, companyId],
      );

      res.status(201).json(newStockOut[0]);
    } catch (error) {
      await connection.rollback();
      console.error("Create stock out error:", error);
      res.status(500).json({ error: "Server error" });
    } finally {
      connection.release();
    }
  },

  getAllStockOut: async (req, res) => {
    try {
      const companyId = req.session.companyId;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;

      const [transactions] = await pool.query(
        `SELECT so.*, p.product_name, p.product_code
                FROM stock_out so
                JOIN products p ON so.product_id = p.id
                WHERE so.company_id = ?
                ORDER BY so.created_at DESC
                LIMIT ? OFFSET ?`,
        [companyId, limit, offset],
      );

      const [totalResult] = await pool.query(
        "SELECT COUNT(*) as total FROM stock_out WHERE company_id = ?",
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
      console.error("Get stock out error:", error);
      res.status(500).json({ error: "Server error" });
    }
  },
};

module.exports = stockOutController;
