// backend/controllers/supplierController.js
const pool = require("../config/db");
const { validationResult } = require("express-validator");

const supplierController = {
  // Get all suppliers
  getAllSuppliers: async (req, res) => {
    try {
      const companyId = req.session.companyId;

      const [suppliers] = await pool.query(
        "SELECT * FROM suppliers WHERE company_id = ? ORDER BY created_at DESC",
        [companyId],
      );

      res.json(suppliers);
    } catch (error) {
      console.error("Get suppliers error:", error);
      res.status(500).json({ error: "Server error" });
    }
  },

  // Get single supplier
  getSupplier: async (req, res) => {
    try {
      const companyId = req.session.companyId;

      const [suppliers] = await pool.query(
        "SELECT * FROM suppliers WHERE id = ? AND company_id = ?",
        [req.params.id, companyId],
      );

      if (suppliers.length === 0) {
        return res.status(404).json({ error: "Supplier not found" });
      }

      res.json(suppliers[0]);
    } catch (error) {
      console.error("Get supplier error:", error);
      res.status(500).json({ error: "Server error" });
    }
  },

  // Create supplier
  createSupplier: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const companyId = req.session.companyId;
      const { supplier_name, phone, email, address } = req.body;

      const [result] = await pool.query(
        "INSERT INTO suppliers (company_id, supplier_name, phone, email, address) VALUES (?, ?, ?, ?, ?)",
        [companyId, supplier_name, phone, email, address],
      );

      const [newSupplier] = await pool.query(
        "SELECT * FROM suppliers WHERE id = ? AND company_id = ?",
        [result.insertId, companyId],
      );

      res.status(201).json(newSupplier[0]);
    } catch (error) {
      console.error("Create supplier error:", error);
      res.status(500).json({ error: "Server error" });
    }
  },

  // Update supplier
  updateSupplier: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const companyId = req.session.companyId;
      const { supplier_name, phone, email, address } = req.body;

      const [result] = await pool.query(
        "UPDATE suppliers SET supplier_name = ?, phone = ?, email = ?, address = ? WHERE id = ? AND company_id = ?",
        [supplier_name, phone, email, address, req.params.id, companyId],
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Supplier not found" });
      }

      const [updated] = await pool.query(
        "SELECT * FROM suppliers WHERE id = ? AND company_id = ?",
        [req.params.id, companyId],
      );

      res.json(updated[0]);
    } catch (error) {
      console.error("Update supplier error:", error);
      res.status(500).json({ error: "Server error" });
    }
  },

  // Delete supplier
  deleteSupplier: async (req, res) => {
    try {
      const companyId = req.session.companyId;

      // Check if supplier has any stock in records
      const [stockIn] = await pool.query(
        "SELECT id FROM stock_in WHERE supplier_id = ? AND company_id = ? LIMIT 1",
        [req.params.id, companyId],
      );

      if (stockIn.length > 0) {
        return res.status(400).json({
          error: "Cannot delete supplier with existing stock in records",
        });
      }

      const [result] = await pool.query(
        "DELETE FROM suppliers WHERE id = ? AND company_id = ?",
        [req.params.id, companyId],
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Supplier not found" });
      }

      res.json({ success: true, message: "Supplier deleted successfully" });
    } catch (error) {
      console.error("Delete supplier error:", error);
      res.status(500).json({ error: "Server error" });
    }
  },

  // Get supplier purchase history
  getPurchaseHistory: async (req, res) => {
    try {
      const companyId = req.session.companyId;

      const [history] = await pool.query(
        `SELECT si.*, p.product_name 
                FROM stock_in si
                JOIN products p ON si.product_id = p.id
                WHERE si.supplier_id = ? AND si.company_id = ?
                ORDER BY si.purchase_date DESC`,
        [req.params.id, companyId],
      );

      res.json(history);
    } catch (error) {
      console.error("Get purchase history error:", error);
      res.status(500).json({ error: "Server error" });
    }
  },
};

module.exports = supplierController;
