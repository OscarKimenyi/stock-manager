const pool = require('../config/db');

const StockOut = {
    // Create new stock out transaction
    async create(transactionData) {
        const { product_id, quantity, date, notes } = transactionData;

        const [result] = await pool.query(
            'INSERT INTO stock_out (product_id, quantity, date, notes) VALUES (?, ?, ?, ?)',
            [product_id, quantity, date, notes]
        );

        return result.insertId;
    },

    // Find all stock out transactions with pagination
    async findAll(options = {}) {
        const { page = 1, limit = 10, product_id, start_date, end_date } = options;
        const offset = (page - 1) * limit;

        let query = `
            SELECT so.*, p.product_name, p.product_code 
            FROM stock_out so
            JOIN products p ON so.product_id = p.id
            WHERE 1=1
        `;
        let countQuery = 'SELECT COUNT(*) as total FROM stock_out WHERE 1=1';
        let params = [];
        let countParams = [];

        if (product_id) {
            query += ' AND so.product_id = ?';
            countQuery += ' AND product_id = ?';
            params.push(product_id);
            countParams.push(product_id);
        }

        if (start_date && end_date) {
            query += ' AND DATE(so.date) BETWEEN ? AND ?';
            countQuery += ' AND DATE(date) BETWEEN ? AND ?';
            params.push(start_date, end_date);
            countParams.push(start_date, end_date);
        }

        query += ' ORDER BY so.created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const [transactions] = await pool.query(query, params);
        const [totalResult] = await pool.query(countQuery, countParams);

        return {
            transactions,
            pagination: {
                page,
                limit,
                total: totalResult[0].total,
                pages: Math.ceil(totalResult[0].total / limit)
            }
        };
    },

    // Find by ID
    async findById(id) {
        const [transactions] = await pool.query(
            `SELECT so.*, p.product_name, p.product_code 
            FROM stock_out so
            JOIN products p ON so.product_id = p.id
            WHERE so.id = ?`,
            [id]
        );
        return transactions[0];
    },

    // Get statistics
    async getStatistics(filters = {}) {
        const { start_date, end_date, product_id } = filters;

        let query = `
            SELECT 
                COUNT(*) as total_transactions,
                COALESCE(SUM(quantity), 0) as total_quantity
            FROM stock_out
            WHERE 1=1
        `;
        let params = [];

        if (start_date && end_date) {
            query += ' AND DATE(date) BETWEEN ? AND ?';
            params.push(start_date, end_date);
        }

        if (product_id) {
            query += ' AND product_id = ?';
            params.push(product_id);
        }

        const [stats] = await pool.query(query, params);
        return stats[0];
    },

    // Get recent transactions
    async getRecent(limit = 5) {
        const [transactions] = await pool.query(
            `SELECT so.*, p.product_name 
            FROM stock_out so
            JOIN products p ON so.product_id = p.id
            ORDER BY so.created_at DESC
            LIMIT ?`,
            [limit]
        );
        return transactions;
    },

    // Get total stock out count
    async getTotalCount() {
        const [result] = await pool.query('SELECT COUNT(*) as count FROM stock_out');
        return result[0].count;
    },

    // Check if product has sufficient stock
    async checkStock(productId, requestedQuantity) {
        const [products] = await pool.query(
            'SELECT quantity FROM products WHERE id = ?',
            [productId]
        );

        if (products.length === 0) {
            return { sufficient: false, error: 'Product not found' };
        }

        const availableQuantity = products[0].quantity;
        return {
            sufficient: availableQuantity >= requestedQuantity,
            available: availableQuantity,
            requested: requestedQuantity
        };
    },

    // Get daily stock out summary
    async getDailySummary(date) {
        const [summary] = await pool.query(
            `SELECT 
                DATE(date) as date,
                COUNT(*) as total_transactions,
                COALESCE(SUM(quantity), 0) as total_quantity
            FROM stock_out
            WHERE DATE(date) = ?
            GROUP BY DATE(date)`,
            [date]
        );
        return summary[0];
    },

    // Get monthly trend
    async getMonthlyTrend(year, month) {
        const [trend] = await pool.query(
            `SELECT 
                DAY(date) as day,
                COUNT(*) as transactions,
                COALESCE(SUM(quantity), 0) as quantity
            FROM stock_out
            WHERE YEAR(date) = ? AND MONTH(date) = ?
            GROUP BY DAY(date)
            ORDER BY day`,
            [year, month]
        );
        return trend;
    }
};

module.exports = StockOut;