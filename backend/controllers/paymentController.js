const pool = require('../config/db');
const { validationResult } = require('express-validator');

// Helper function to ensure payments table exists
async function ensurePaymentsTable() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS payments (
                id INT PRIMARY KEY AUTO_INCREMENT,
                stock_in_id INT NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                payment_method ENUM('Cash', 'Bank', 'Mobile Money') NOT NULL,
                payment_date DATE NOT NULL,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (stock_in_id) REFERENCES stock_in(id) ON DELETE CASCADE,
                INDEX idx_payment_date (payment_date)
            )
        `);
        console.log('Payments table ensured');
    } catch (error) {
        console.error('Error ensuring payments table:', error);
    }
}

const paymentController = {
    // Make a payment
    makePayment: async (req, res) => {
        const connection = await pool.getConnection();
        
        try {
            await connection.beginTransaction();

            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                await connection.rollback();
                return res.status(400).json({ errors: errors.array() });
            }

            const { stock_in_id, amount, payment_method, payment_date, notes } = req.body;

            // Ensure payments table exists
            await ensurePaymentsTable();

            // Get the stock in record
            const [stockIn] = await connection.query(
                'SELECT * FROM stock_in WHERE id = ?',
                [stock_in_id]
            );

            if (stockIn.length === 0) {
                await connection.rollback();
                return res.status(404).json({ error: 'Stock in record not found' });
            }

            const currentRecord = stockIn[0];
            const currentBalance = parseFloat(currentRecord.balance);

            // Check if payment amount is valid
            if (amount > currentBalance) {
                await connection.rollback();
                return res.status(400).json({ 
                    error: 'Payment amount exceeds remaining balance',
                    max_allowed: currentBalance
                });
            }

            // Insert payment record
            const [paymentResult] = await connection.query(
                `INSERT INTO payments 
                (stock_in_id, amount, payment_method, payment_date, notes) 
                VALUES (?, ?, ?, ?, ?)`,
                [stock_in_id, amount, payment_method, payment_date, notes]
            );

            // Update stock_in record
            const newAmountPaid = parseFloat(currentRecord.amount_paid) + amount;
            await connection.query(
                'UPDATE stock_in SET amount_paid = ? WHERE id = ?',
                [newAmountPaid, stock_in_id]
            );

            await connection.commit();

            // Get updated record
            const [updatedStockIn] = await connection.query(
                `SELECT si.*, p.product_name, s.supplier_name 
                FROM stock_in si
                JOIN products p ON si.product_id = p.id
                JOIN suppliers s ON si.supplier_id = s.id
                WHERE si.id = ?`,
                [stock_in_id]
            );

            // Get payment record
            const [payment] = await connection.query(
                'SELECT * FROM payments WHERE id = ?',
                [paymentResult.insertId]
            );

            res.status(201).json({
                success: true,
                message: 'Payment recorded successfully',
                stock_in: updatedStockIn[0],
                payment: payment[0]
            });

        } catch (error) {
            await connection.rollback();
            console.error('Payment error:', error);
            res.status(500).json({ error: 'Server error: ' + error.message });
        } finally {
            connection.release();
        }
    },

    // Get payment history for a stock in record
    getPaymentHistory: async (req, res) => {
        try {
            // Ensure payments table exists
            await ensurePaymentsTable();

            const [payments] = await pool.query(
                `SELECT p.*, si.product_id, si.supplier_id,
                        pr.product_name, sp.supplier_name
                FROM payments p
                JOIN stock_in si ON p.stock_in_id = si.id
                JOIN products pr ON si.product_id = pr.id
                JOIN suppliers sp ON si.supplier_id = sp.id
                WHERE p.stock_in_id = ?
                ORDER BY p.payment_date DESC`,
                [req.params.stock_in_id]
            );

            res.json(payments);
        } catch (error) {
            console.error('Get payment history error:', error);
            res.status(500).json({ error: 'Server error: ' + error.message });
        }
    },

    // Get all payments for a supplier
    getSupplierPayments: async (req, res) => {
        try {
            // Ensure payments table exists
            await ensurePaymentsTable();

            const [payments] = await pool.query(
                `SELECT p.*, si.product_id, p2.product_name,
                        si.supplier_id, s.supplier_name
                FROM payments p
                JOIN stock_in si ON p.stock_in_id = si.id
                JOIN products p2 ON si.product_id = p2.id
                JOIN suppliers s ON si.supplier_id = s.id
                WHERE si.supplier_id = ?
                ORDER BY p.payment_date DESC`,
                [req.params.supplier_id]
            );

            // Get summary
            const [summary] = await pool.query(
                `SELECT 
                    COUNT(*) as total_payments,
                    COALESCE(SUM(p.amount), 0) as total_amount
                FROM payments p
                JOIN stock_in si ON p.stock_in_id = si.id
                WHERE si.supplier_id = ?`,
                [req.params.supplier_id]
            );

            res.json({
                payments,
                summary: summary[0]
            });
        } catch (error) {
            console.error('Get supplier payments error:', error);
            res.status(500).json({ error: 'Server error: ' + error.message });
        }
    }
};

module.exports = paymentController;