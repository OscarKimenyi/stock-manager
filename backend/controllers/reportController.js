// backend/controllers/reportController.js
const pool = require("../config/db");

const reportController = {
  // Dashboard Statistics
  getDashboardStats: async (req, res) => {
    try {
      const companyId = req.session.companyId;

      // Total Products
      const [totalProducts] = await pool.query(
        "SELECT COUNT(*) as count FROM products WHERE company_id = ?",
        [companyId],
      );

      // Total Suppliers
      const [totalSuppliers] = await pool.query(
        "SELECT COUNT(*) as count FROM suppliers WHERE company_id = ?",
        [companyId],
      );

      // Total Stock Quantity
      const [totalStock] = await pool.query(
        "SELECT COALESCE(SUM(quantity), 0) as total FROM products WHERE company_id = ?",
        [companyId],
      );

      // Total Stock In Transactions
      const [totalStockIn] = await pool.query(
        "SELECT COUNT(*) as count FROM stock_in WHERE company_id = ?",
        [companyId],
      );

      // Total Stock Out Transactions
      const [totalStockOut] = await pool.query(
        "SELECT COUNT(*) as count FROM stock_out WHERE company_id = ?",
        [companyId],
      );

      // Total Unpaid Balance
      const [unpaidBalance] = await pool.query(
        "SELECT COALESCE(SUM(balance), 0) as total FROM stock_in WHERE company_id = ? AND balance > 0",
        [companyId],
      );

      // Recent Stock In Transactions (last 5)
      const [recentStockIn] = await pool.query(
        `SELECT si.*, p.product_name, s.supplier_name 
                FROM stock_in si
                JOIN products p ON si.product_id = p.id
                JOIN suppliers s ON si.supplier_id = s.id
                WHERE si.company_id = ?
                ORDER BY si.created_at DESC
                LIMIT 5`,
        [companyId],
      );

      // Low Stock Products (last 5)
      const [lowStock] = await pool.query(
        `SELECT * FROM products 
                WHERE company_id = ? AND quantity <= minimum_stock_level 
                ORDER BY quantity ASC 
                LIMIT 5`,
        [companyId],
      );

      res.json({
        statistics: {
          total_products: totalProducts[0].count,
          total_suppliers: totalSuppliers[0].count,
          total_stock: totalStock[0].total,
          total_stock_in: totalStockIn[0].count,
          total_stock_out: totalStockOut[0].count,
          total_unpaid: parseFloat(unpaidBalance[0].total) || 0,
        },
        recent_stock_in: recentStockIn,
        low_stock_alerts: lowStock,
      });
    } catch (error) {
      console.error("Dashboard stats error:", error);
      res.status(500).json({ error: "Server error" });
    }
  },

  // Current Stock Report
  getCurrentStock: async (req, res) => {
    try {
      const companyId = req.session.companyId;
      const { product_id } = req.query;

      let query = `
                SELECT p.*, 
                       COALESCE(SUM(si.quantity), 0) as total_purchased,
                       COALESCE(SUM(so.quantity), 0) as total_sold
                FROM products p
                LEFT JOIN stock_in si ON p.id = si.product_id AND si.company_id = p.company_id
                LEFT JOIN stock_out so ON p.id = so.product_id AND so.company_id = p.company_id
                WHERE p.company_id = ?
            `;

      let params = [companyId];

      if (product_id) {
        query += " AND p.id = ?";
        params.push(product_id);
      }

      query += " GROUP BY p.id ORDER BY p.product_name";

      const [products] = await pool.query(query, params);

      // Add stock value calculation
      const report = products.map((product) => ({
        ...product,
        stock_value: product.quantity * (product.buying_price || 0),
        status:
          product.quantity <= product.minimum_stock_level
            ? "Low Stock"
            : "Normal",
      }));

      res.json(report);
    } catch (error) {
      console.error("Current stock report error:", error);
      res.status(500).json({ error: "Server error" });
    }
  },

  // Stock In Report
  getStockInReport: async (req, res) => {
    try {
      const companyId = req.session.companyId;
      const { start_date, end_date, supplier_id, product_id } = req.query;

      let query = `
                SELECT si.*, p.product_name, p.product_code, s.supplier_name
                FROM stock_in si
                JOIN products p ON si.product_id = p.id
                JOIN suppliers s ON si.supplier_id = s.id
                WHERE si.company_id = ?
            `;

      let params = [companyId];

      if (start_date && end_date) {
        query += " AND DATE(si.purchase_date) BETWEEN ? AND ?";
        params.push(start_date, end_date);
      }

      if (supplier_id) {
        query += " AND si.supplier_id = ?";
        params.push(supplier_id);
      }

      if (product_id) {
        query += " AND si.product_id = ?";
        params.push(product_id);
      }

      query += " ORDER BY si.purchase_date DESC";

      const [transactions] = await pool.query(query, params);

      // Calculate totals
      const totals = transactions.reduce(
        (acc, curr) => {
          acc.total_quantity += curr.quantity;
          acc.total_amount += parseFloat(curr.total_amount);
          acc.total_paid += parseFloat(curr.amount_paid);
          acc.total_balance += parseFloat(curr.balance);
          return acc;
        },
        { total_quantity: 0, total_amount: 0, total_paid: 0, total_balance: 0 },
      );

      res.json({
        transactions,
        summary: totals,
      });
    } catch (error) {
      console.error("Stock in report error:", error);
      res.status(500).json({ error: "Server error" });
    }
  },

  // Stock Out Report
  getStockOutReport: async (req, res) => {
    try {
      const companyId = req.session.companyId;
      const { start_date, end_date, product_id } = req.query;

      let query = `
                SELECT so.*, p.product_name, p.product_code
                FROM stock_out so
                JOIN products p ON so.product_id = p.id
                WHERE so.company_id = ?
            `;

      let params = [companyId];

      if (start_date && end_date) {
        query += " AND DATE(so.date) BETWEEN ? AND ?";
        params.push(start_date, end_date);
      }

      if (product_id) {
        query += " AND so.product_id = ?";
        params.push(product_id);
      }

      query += " ORDER BY so.date DESC";

      const [transactions] = await pool.query(query, params);

      const total_quantity = transactions.reduce(
        (sum, curr) => sum + curr.quantity,
        0,
      );

      res.json({
        transactions,
        summary: { total_quantity },
      });
    } catch (error) {
      console.error("Stock out report error:", error);
      res.status(500).json({ error: "Server error" });
    }
  },

  // Supplier Purchase Report
  getSupplierPurchaseReport: async (req, res) => {
    try {
      const companyId = req.session.companyId;
      const { supplier_id, start_date, end_date } = req.query;

      let query = `
                SELECT s.*,
                       COUNT(DISTINCT si.id) as total_purchases,
                       COALESCE(SUM(si.quantity), 0) as total_quantity,
                       COALESCE(SUM(si.total_amount), 0) as total_amount,
                       COALESCE(SUM(si.amount_paid), 0) as total_paid,
                       COALESCE(SUM(si.balance), 0) as total_balance
                FROM suppliers s
                LEFT JOIN stock_in si ON s.id = si.supplier_id AND si.company_id = s.company_id
                WHERE s.company_id = ?
            `;

      let params = [companyId];

      if (supplier_id) {
        query += " AND s.id = ?";
        params.push(supplier_id);
      }

      if (start_date && end_date) {
        query += " AND DATE(si.purchase_date) BETWEEN ? AND ?";
        params.push(start_date, end_date);
      }

      query += " GROUP BY s.id ORDER BY s.supplier_name";

      const [report] = await pool.query(query, params);

      res.json(report);
    } catch (error) {
      console.error("Supplier purchase report error:", error);
      res.status(500).json({ error: "Server error" });
    }
  },

  // Unpaid Purchase Report
  getUnpaidReport: async (req, res) => {
    try {
      const companyId = req.session.companyId;
      const { supplier_id } = req.query;

      let query = `
                SELECT si.*, p.product_name, s.supplier_name, s.phone, s.email
                FROM stock_in si
                JOIN products p ON si.product_id = p.id
                JOIN suppliers s ON si.supplier_id = s.id
                WHERE si.company_id = ? AND si.balance > 0
            `;

      let params = [companyId];

      if (supplier_id) {
        query += " AND si.supplier_id = ?";
        params.push(supplier_id);
      }

      query += " ORDER BY si.balance DESC";

      const [unpaid] = await pool.query(query, params);

      const total_unpaid = unpaid.reduce(
        (sum, curr) => sum + parseFloat(curr.balance),
        0,
      );

      res.json({
        transactions: unpaid,
        total_unpaid,
      });
    } catch (error) {
      console.error("Unpaid report error:", error);
      res.status(500).json({ error: "Server error" });
    }
  },

  // Low Stock Report
  getLowStockReport: async (req, res) => {
    try {
      const companyId = req.session.companyId;

      const [products] = await pool.query(
        `
                SELECT p.*, 
                       COALESCE(SUM(si.quantity), 0) as total_purchased,
                       (p.minimum_stock_level - p.quantity) as required_quantity
                FROM products p
                LEFT JOIN stock_in si ON p.id = si.product_id AND si.company_id = p.company_id
                WHERE p.company_id = ? AND p.quantity <= p.minimum_stock_level
                GROUP BY p.id
                ORDER BY (p.quantity / p.minimum_stock_level) ASC
            `,
        [companyId],
      );

      res.json(products);
    } catch (error) {
      console.error("Low stock report error:", error);
      res.status(500).json({ error: "Server error" });
    }
  },

  // Product Performance Report
  getProductPerformanceReport: async (req, res) => {
    try {
      const companyId = req.session.companyId;
      const { start_date, end_date } = req.query;

      let query = `
                SELECT 
                    p.id,
                    p.product_name,
                    p.product_code,
                    p.unit_type,
                    p.quantity as current_stock,
                    COALESCE(SUM(si.quantity), 0) as total_purchased,
                    COALESCE(SUM(si.total_amount), 0) as total_purchase_value,
                    COALESCE(SUM(so.quantity), 0) as total_sold,
                    p.minimum_stock_level
                FROM products p
                LEFT JOIN stock_in si ON p.id = si.product_id AND si.company_id = p.company_id
                LEFT JOIN stock_out so ON p.id = so.product_id AND so.company_id = p.company_id
                WHERE p.company_id = ?
            `;

      let params = [companyId];

      if (start_date && end_date) {
        query += " AND DATE(si.purchase_date) BETWEEN ? AND ?";
        params.push(start_date, end_date);
        query += " AND DATE(so.date) BETWEEN ? AND ?";
        params.push(start_date, end_date);
      }

      query += " GROUP BY p.id ORDER BY total_sold DESC";

      const [performance] = await pool.query(query, params);

      // Calculate turnover rate
      const report = performance.map((product) => ({
        ...product,
        turnover_rate:
          product.total_sold > 0
            ? (product.total_sold / (product.total_purchased || 1)) * 100
            : 0,
        stock_status:
          product.current_stock <= product.minimum_stock_level
            ? "Critical"
            : "Normal",
      }));

      res.json(report);
    } catch (error) {
      console.error("Product performance report error:", error);
      res.status(500).json({ error: "Server error" });
    }
  },

  // Monthly Sales Report
  getMonthlySalesReport: async (req, res) => {
    try {
      const companyId = req.session.companyId;
      const { year } = req.query;
      const currentYear = year || new Date().getFullYear();

      const [monthlyData] = await pool.query(
        `
                SELECT 
                    MONTH(date) as month,
                    COUNT(*) as transaction_count,
                    SUM(quantity) as total_quantity
                FROM stock_out
                WHERE company_id = ? AND YEAR(date) = ?
                GROUP BY MONTH(date)
                ORDER BY month ASC
            `,
        [companyId, currentYear],
      );

      // Initialize all months with zero
      const fullYearData = [];
      for (let i = 1; i <= 12; i++) {
        const monthData = monthlyData.find((m) => m.month === i);
        fullYearData.push({
          month: i,
          month_name: new Date(currentYear, i - 1, 1).toLocaleString(
            "default",
            { month: "long" },
          ),
          transaction_count: monthData ? monthData.transaction_count : 0,
          total_quantity: monthData ? monthData.total_quantity : 0,
        });
      }

      res.json({
        year: currentYear,
        data: fullYearData,
        total_transactions: fullYearData.reduce(
          (sum, m) => sum + m.transaction_count,
          0,
        ),
        total_quantity: fullYearData.reduce(
          (sum, m) => sum + m.total_quantity,
          0,
        ),
      });
    } catch (error) {
      console.error("Monthly sales report error:", error);
      res.status(500).json({ error: "Server error" });
    }
  },

  // Supplier Payment Summary
  getSupplierPaymentSummary: async (req, res) => {
    try {
      const companyId = req.session.companyId;

      const [summary] = await pool.query(
        `
                SELECT 
                    s.id,
                    s.supplier_name,
                    COUNT(DISTINCT si.id) as total_transactions,
                    COALESCE(SUM(si.total_amount), 0) as total_purchased,
                    COALESCE(SUM(si.amount_paid), 0) as total_paid,
                    COALESCE(SUM(si.balance), 0) as outstanding_balance,
                    COUNT(DISTINCT CASE WHEN si.balance > 0 THEN si.id END) as unpaid_transactions
                FROM suppliers s
                LEFT JOIN stock_in si ON s.id = si.supplier_id AND si.company_id = s.company_id
                WHERE s.company_id = ?
                GROUP BY s.id
                ORDER BY outstanding_balance DESC
            `,
        [companyId],
      );

      res.json(summary);
    } catch (error) {
      console.error("Supplier payment summary error:", error);
      res.status(500).json({ error: "Server error" });
    }
  },

  // Stock Movement Summary
  getStockMovementSummary: async (req, res) => {
    try {
      const companyId = req.session.companyId;
      const { period = "month" } = req.query; // day, week, month, year

      let dateFormat;
      let groupBy;

      switch (period) {
        case "day":
          dateFormat = "%Y-%m-%d";
          groupBy = "DATE(created_at)";
          break;
        case "week":
          dateFormat = "%Y-%u";
          groupBy = "YEARWEEK(created_at)";
          break;
        case "year":
          dateFormat = "%Y";
          groupBy = "YEAR(created_at)";
          break;
        default: // month
          dateFormat = "%Y-%m";
          groupBy = 'DATE_FORMAT(created_at, "%Y-%m")';
      }

      const [stockInMovement] = await pool.query(
        `
                SELECT 
                    DATE_FORMAT(created_at, ?) as period,
                    COUNT(*) as transaction_count,
                    SUM(quantity) as total_quantity,
                    SUM(total_amount) as total_value
                FROM stock_in
                WHERE company_id = ?
                GROUP BY ${groupBy}
                ORDER BY period DESC
                LIMIT 12
            `,
        [dateFormat, companyId],
      );

      const [stockOutMovement] = await pool.query(
        `
                SELECT 
                    DATE_FORMAT(created_at, ?) as period,
                    COUNT(*) as transaction_count,
                    SUM(quantity) as total_quantity
                FROM stock_out
                WHERE company_id = ?
                GROUP BY ${groupBy}
                ORDER BY period DESC
                LIMIT 12
            `,
        [dateFormat, companyId],
      );

      res.json({
        period,
        stock_in: stockInMovement,
        stock_out: stockOutMovement,
      });
    } catch (error) {
      console.error("Stock movement summary error:", error);
      res.status(500).json({ error: "Server error" });
    }
  },
};

module.exports = reportController;
