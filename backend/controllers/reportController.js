const pool = require('../config/db');

const reportController = {
    // Current Stock Report
    getCurrentStock: async (req, res) => {
        try {
            const { product_id, supplier_id } = req.query;

            let query = `
                SELECT p.*, 
                       COALESCE(SUM(si.quantity), 0) as total_purchased,
                       COALESCE(SUM(so.quantity), 0) as total_sold
                FROM products p
                LEFT JOIN stock_in si ON p.id = si.product_id
                LEFT JOIN stock_out so ON p.id = so.product_id
                WHERE 1=1
            `;
            
            let params = [];

            if (product_id) {
                query += ' AND p.id = ?';
                params.push(product_id);
            }

            query += ' GROUP BY p.id ORDER BY p.product_name';

            const [products] = await pool.query(query, params);

            // Add value calculation
            const report = products.map(product => ({
                ...product,
                stock_value: product.quantity * (product.buying_price || 0),
                status: product.quantity <= product.minimum_stock_level ? 'Low Stock' : 'Normal'
            }));

            res.json(report);

        } catch (error) {
            console.error('Current stock report error:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    // Stock In Report
    getStockInReport: async (req, res) => {
        try {
            const { start_date, end_date, supplier_id, product_id } = req.query;

            let query = `
                SELECT si.*, p.product_name, p.product_code, s.supplier_name
                FROM stock_in si
                JOIN products p ON si.product_id = p.id
                JOIN suppliers s ON si.supplier_id = s.id
                WHERE 1=1
            `;
            
            let params = [];

            if (start_date && end_date) {
                query += ' AND DATE(si.purchase_date) BETWEEN ? AND ?';
                params.push(start_date, end_date);
            }

            if (supplier_id) {
                query += ' AND si.supplier_id = ?';
                params.push(supplier_id);
            }

            if (product_id) {
                query += ' AND si.product_id = ?';
                params.push(product_id);
            }

            query += ' ORDER BY si.purchase_date DESC';

            const [transactions] = await pool.query(query, params);

            // Calculate totals
            const totals = transactions.reduce((acc, curr) => {
                acc.total_quantity += curr.quantity;
                acc.total_amount += parseFloat(curr.total_amount);
                acc.total_paid += parseFloat(curr.amount_paid);
                acc.total_balance += parseFloat(curr.balance);
                return acc;
            }, { total_quantity: 0, total_amount: 0, total_paid: 0, total_balance: 0 });

            res.json({
                transactions,
                summary: totals
            });

        } catch (error) {
            console.error('Stock in report error:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    // Stock Out Report
    getStockOutReport: async (req, res) => {
        try {
            const { start_date, end_date, product_id } = req.query;

            let query = `
                SELECT so.*, p.product_name, p.product_code
                FROM stock_out so
                JOIN products p ON so.product_id = p.id
                WHERE 1=1
            `;
            
            let params = [];

            if (start_date && end_date) {
                query += ' AND DATE(so.date) BETWEEN ? AND ?';
                params.push(start_date, end_date);
            }

            if (product_id) {
                query += ' AND so.product_id = ?';
                params.push(product_id);
            }

            query += ' ORDER BY so.date DESC';

            const [transactions] = await pool.query(query, params);

            const total_quantity = transactions.reduce((sum, curr) => sum + curr.quantity, 0);

            res.json({
                transactions,
                summary: { total_quantity }
            });

        } catch (error) {
            console.error('Stock out report error:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    // Supplier Purchase Report
    getSupplierPurchaseReport: async (req, res) => {
        try {
            const { supplier_id, start_date, end_date } = req.query;

            let query = `
                SELECT s.*,
                       COUNT(DISTINCT si.id) as total_purchases,
                       COALESCE(SUM(si.quantity), 0) as total_quantity,
                       COALESCE(SUM(si.total_amount), 0) as total_amount,
                       COALESCE(SUM(si.amount_paid), 0) as total_paid,
                       COALESCE(SUM(si.balance), 0) as total_balance
                FROM suppliers s
                LEFT JOIN stock_in si ON s.id = si.supplier_id
                WHERE 1=1
            `;
            
            let params = [];

            if (supplier_id) {
                query += ' AND s.id = ?';
                params.push(supplier_id);
            }

            if (start_date && end_date) {
                query += ' AND DATE(si.purchase_date) BETWEEN ? AND ?';
                params.push(start_date, end_date);
            }

            query += ' GROUP BY s.id ORDER BY s.supplier_name';

            const [report] = await pool.query(query, params);

            res.json(report);

        } catch (error) {
            console.error('Supplier purchase report error:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    // Unpaid Purchase Report
    getUnpaidReport: async (req, res) => {
        try {
            const { supplier_id } = req.query;

            let query = `
                SELECT si.*, p.product_name, s.supplier_name, s.phone, s.email
                FROM stock_in si
                JOIN products p ON si.product_id = p.id
                JOIN suppliers s ON si.supplier_id = s.id
                WHERE si.balance > 0
            `;
            
            let params = [];

            if (supplier_id) {
                query += ' AND si.supplier_id = ?';
                params.push(supplier_id);
            }

            query += ' ORDER BY si.balance DESC';

            const [unpaid] = await pool.query(query, params);

            const total_unpaid = unpaid.reduce((sum, curr) => sum + parseFloat(curr.balance), 0);

            res.json({
                transactions: unpaid,
                total_unpaid
            });

        } catch (error) {
            console.error('Unpaid report error:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    // Low Stock Report
    getLowStockReport: async (req, res) => {
        try {
            const [products] = await pool.query(`
                SELECT p.*, 
                       COALESCE(SUM(si.quantity), 0) as total_purchased,
                       (p.minimum_stock_level - p.quantity) as required_quantity
                FROM products p
                LEFT JOIN stock_in si ON p.id = si.product_id
                WHERE p.quantity <= p.minimum_stock_level
                GROUP BY p.id
                ORDER BY (p.quantity / p.minimum_stock_level) ASC
            `);

            res.json(products);

        } catch (error) {
            console.error('Low stock report error:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    // Dashboard Statistics
    getDashboardStats: async (req, res) => {
        try {
            // Total Products
            const [totalProducts] = await pool.query('SELECT COUNT(*) as count FROM products');
            
            // Total Suppliers
            const [totalSuppliers] = await pool.query('SELECT COUNT(*) as count FROM suppliers');
            
            // Total Stock Quantity
            const [totalStock] = await pool.query('SELECT COALESCE(SUM(quantity), 0) as total FROM products');
            
            // Total Stock In Transactions
            const [totalStockIn] = await pool.query('SELECT COUNT(*) as count FROM stock_in');
            
            // Total Stock Out Transactions
            const [totalStockOut] = await pool.query('SELECT COUNT(*) as count FROM stock_out');
            
            // Total Unpaid Balance
            const [unpaidBalance] = await pool.query('SELECT COALESCE(SUM(balance), 0) as total FROM stock_in WHERE balance > 0');
            
            // Recent Stock In
            const [recentStockIn] = await pool.query(`
                SELECT si.*, p.product_name, s.supplier_name 
                FROM stock_in si
                JOIN products p ON si.product_id = p.id
                JOIN suppliers s ON si.supplier_id = s.id
                ORDER BY si.created_at DESC
                LIMIT 5
            `);
            
            // Low Stock Products
            const [lowStock] = await pool.query(`
                SELECT * FROM products 
                WHERE quantity <= minimum_stock_level 
                ORDER BY quantity ASC 
                LIMIT 5
            `);

            res.json({
                statistics: {
                    total_products: totalProducts[0].count,
                    total_suppliers: totalSuppliers[0].count,
                    total_stock: totalStock[0].total,
                    total_stock_in: totalStockIn[0].count,
                    total_stock_out: totalStockOut[0].count,
                    total_unpaid: unpaidBalance[0].total
                },
                recent_stock_in: recentStockIn,
                low_stock_alerts: lowStock
            });

        } catch (error) {
            console.error('Dashboard stats error:', error);
            res.status(500).json({ error: 'Server error' });
        }
    }
};

module.exports = reportController;