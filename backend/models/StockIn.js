const pool = require('../config/db');

const StockIn = {
    // Create new stock in transaction
    async create(transactionData) {
        const {
            product_id,
            supplier_id,
            quantity,
            buying_price,
            amount_paid,
            payment_method,
            receipt_file,
            purchase_date,
            notes
        } = transactionData;

        const [result] = await pool.query(
            `INSERT INTO stock_in 
            (product_id, supplier_id, quantity, buying_price, amount_paid, 
            payment_method, receipt_file, purchase_date, notes) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [product_id, supplier_id, quantity, buying_price, amount_paid,
             payment_method, receipt_file, purchase_date, notes]
        );

        return result.insertId;
    },

    // Find all stock in transactions with pagination
    async findAll(options = {}) {
        const { page = 1, limit = 10, supplier_id, product_id, start_date, end_date } = options;
        const offset = (page - 1) * limit;

        let query = `
            SELECT si.*, p.product_name, p.product_code, s.supplier_name 
            FROM stock_in si
            JOIN products p ON si.product_id = p.id
            JOIN suppliers s ON si.supplier_id = s.id
            WHERE 1=1
        `;
        let countQuery = 'SELECT COUNT(*) as total FROM stock_in WHERE 1=1';
        let params = [];
        let countParams = [];

        if (supplier_id) {
            query += ' AND si.supplier_id = ?';
            countQuery += ' AND supplier_id = ?';
            params.push(supplier_id);
            countParams.push(supplier_id);
        }

        if (product_id) {
            query += ' AND si.product_id = ?';
            countQuery += ' AND product_id = ?';
            params.push(product_id);
            countParams.push(product_id);
        }

        if (start_date && end_date) {
            query += ' AND DATE(si.purchase_date) BETWEEN ? AND ?';
            countQuery += ' AND DATE(purchase_date) BETWEEN ? AND ?';
            params.push(start_date, end_date);
            countParams.push(start_date, end_date);
        }

        query += ' ORDER BY si.created_at DESC LIMIT ? OFFSET ?';
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
            `SELECT si.*, p.product_name, p.product_code, s.supplier_name 
            FROM stock_in si
            JOIN products p ON si.product_id = p.id
            JOIN suppliers s ON si.supplier_id = s.id
            WHERE si.id = ?`,
            [id]
        );
        return transactions[0];
    },

    // Get unpaid balances
    async getUnpaidBalances(filters = {}) {
        const { supplier_id } = filters;

        let query = `
            SELECT si.*, p.product_name, s.supplier_name, s.phone as supplier_phone
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
        return unpaid;
    },

    // Get total unpaid balance
    async getTotalUnpaidBalance() {
        const [result] = await pool.query(
            'SELECT COALESCE(SUM(balance), 0) as total FROM stock_in WHERE balance > 0'
        );
        return result[0].total;
    },

    // Get statistics
    async getStatistics(filters = {}) {
        const { start_date, end_date, supplier_id } = filters;

        let query = `
            SELECT 
                COUNT(*) as total_transactions,
                COALESCE(SUM(quantity), 0) as total_quantity,
                COALESCE(SUM(total_amount), 0) as total_amount,
                COALESCE(SUM(amount_paid), 0) as total_paid,
                COALESCE(SUM(balance), 0) as total_balance
            FROM stock_in
            WHERE 1=1
        `;
        let params = [];

        if (start_date && end_date) {
            query += ' AND DATE(purchase_date) BETWEEN ? AND ?';
            params.push(start_date, end_date);
        }

        if (supplier_id) {
            query += ' AND supplier_id = ?';
            params.push(supplier_id);
        }

        const [stats] = await pool.query(query, params);
        return stats[0];
    },

    // Get payment status summary
    async getPaymentStatusSummary() {
        const [summary] = await pool.query(`
            SELECT 
                payment_status,
                COUNT(*) as count,
                COALESCE(SUM(total_amount), 0) as total_amount,
                COALESCE(SUM(balance), 0) as total_balance
            FROM stock_in
            GROUP BY payment_status
        `);
        return summary;
    },

    // Get recent transactions
    async getRecent(limit = 5) {
        const [transactions] = await pool.query(
            `SELECT si.*, p.product_name, s.supplier_name 
            FROM stock_in si
            JOIN products p ON si.product_id = p.id
            JOIN suppliers s ON si.supplier_id = s.id
            ORDER BY si.created_at DESC
            LIMIT ?`,
            [limit]
        );
        return transactions;
    },

    // Update payment
    async updatePayment(id, amount_paid) {
        await pool.query(
            'UPDATE stock_in SET amount_paid = amount_paid + ? WHERE id = ?',
            [amount_paid, id]
        );
        return this.findById(id);
    }
};

module.exports = StockIn;