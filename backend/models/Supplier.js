const pool = require('../config/db');

const Supplier = {
    // Create new supplier
    async create(supplierData) {
        const { supplier_name, phone, email, address } = supplierData;
        const [result] = await pool.query(
            'INSERT INTO suppliers (supplier_name, phone, email, address) VALUES (?, ?, ?, ?)',
            [supplier_name, phone, email, address]
        );
        return result.insertId;
    },

    // Find all suppliers
    async findAll() {
        const [suppliers] = await pool.query(
            'SELECT * FROM suppliers ORDER BY created_at DESC'
        );
        return suppliers;
    },

    // Find supplier by ID
    async findById(id) {
        const [suppliers] = await pool.query(
            'SELECT * FROM suppliers WHERE id = ?',
            [id]
        );
        return suppliers[0];
    },

    // Update supplier
    async update(id, supplierData) {
        const { supplier_name, phone, email, address } = supplierData;
        await pool.query(
            'UPDATE suppliers SET supplier_name = ?, phone = ?, email = ?, address = ? WHERE id = ?',
            [supplier_name, phone, email, address, id]
        );
        return this.findById(id);
    },

    // Delete supplier
    async delete(id) {
        const [result] = await pool.query(
            'DELETE FROM suppliers WHERE id = ?',
            [id]
        );
        return result.affectedRows > 0;
    },

    // Check if supplier has transactions
    async hasTransactions(id) {
        const [result] = await pool.query(
            'SELECT id FROM stock_in WHERE supplier_id = ? LIMIT 1',
            [id]
        );
        return result.length > 0;
    },

    // Get supplier purchase history
    async getPurchaseHistory(id) {
        const [history] = await pool.query(
            `SELECT si.*, p.product_name 
            FROM stock_in si
            JOIN products p ON si.product_id = p.id
            WHERE si.supplier_id = ?
            ORDER BY si.purchase_date DESC`,
            [id]
        );
        return history;
    },

    // Get supplier statistics
    async getStatistics(id) {
        const [stats] = await pool.query(
            `SELECT 
                COUNT(*) as total_purchases,
                COALESCE(SUM(quantity), 0) as total_quantity,
                COALESCE(SUM(total_amount), 0) as total_amount,
                COALESCE(SUM(amount_paid), 0) as total_paid,
                COALESCE(SUM(balance), 0) as total_balance
            FROM stock_in
            WHERE supplier_id = ?`,
            [id]
        );
        return stats[0];
    },

    // Get supplier count
    async getCount() {
        const [result] = await pool.query('SELECT COUNT(*) as count FROM suppliers');
        return result[0].count;
    },

    // Search suppliers
    async search(query) {
        const [suppliers] = await pool.query(
            'SELECT * FROM suppliers WHERE supplier_name LIKE ? OR email LIKE ? OR phone LIKE ?',
            [`%${query}%`, `%${query}%`, `%${query}%`]
        );
        return suppliers;
    }
};

module.exports = Supplier;