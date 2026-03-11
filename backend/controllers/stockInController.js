const pool = require('../config/db');
const { validationResult } = require('express-validator');

const stockInController = {
    // Create stock in transaction
    createStockIn: async (req, res) => {
        const connection = await pool.getConnection();
        
        try {
            await connection.beginTransaction();

            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                await connection.rollback();
                return res.status(400).json({ errors: errors.array() });
            }

            const {
                product_id,
                supplier_id,
                quantity,
                buying_price,
                amount_paid,
                payment_method,
                purchase_date,
                notes
            } = req.body;

            const receipt_file = req.file ? `/uploads/receipts/${req.file.filename}` : null;

            // Calculate total and balance
            const total_amount = quantity * buying_price;
            const balance = total_amount - amount_paid;

            // Insert stock in record
            const [result] = await connection.query(
                `INSERT INTO stock_in 
                (product_id, supplier_id, quantity, buying_price, amount_paid, 
                payment_method, receipt_file, purchase_date, notes) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [product_id, supplier_id, quantity, buying_price, amount_paid, 
                payment_method, receipt_file, purchase_date, notes]
            );

            // Update product quantity
            await connection.query(
                'UPDATE products SET quantity = quantity + ? WHERE id = ?',
                [quantity, product_id]
            );

            await connection.commit();

            // Get created record
            const [newStockIn] = await connection.query(
                `SELECT si.*, p.product_name, s.supplier_name 
                FROM stock_in si
                JOIN products p ON si.product_id = p.id
                JOIN suppliers s ON si.supplier_id = s.id
                WHERE si.id = ?`,
                [result.insertId]
            );

            res.status(201).json(newStockIn[0]);

        } catch (error) {
            await connection.rollback();
            console.error('Create stock in error:', error);
            res.status(500).json({ error: 'Server error' });
        } finally {
            connection.release();
        }
    },

    // Get all stock in transactions
    getAllStockIn: async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const offset = (page - 1) * limit;

            const [transactions] = await pool.query(
                `SELECT si.*, p.product_name, s.supplier_name 
                FROM stock_in si
                JOIN products p ON si.product_id = p.id
                JOIN suppliers s ON si.supplier_id = s.id
                ORDER BY si.created_at DESC
                LIMIT ? OFFSET ?`,
                [limit, offset]
            );

            const [totalResult] = await pool.query(
                'SELECT COUNT(*) as total FROM stock_in'
            );

            res.json({
                transactions,
                pagination: {
                    page,
                    limit,
                    total: totalResult[0].total,
                    pages: Math.ceil(totalResult[0].total / limit)
                }
            });

        } catch (error) {
            console.error('Get stock in error:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    // Get unpaid balances
    getUnpaidBalances: async (req, res) => {
        try {
            const [unpaid] = await pool.query(
                `SELECT si.*, p.product_name, s.supplier_name, s.phone as supplier_phone
                FROM stock_in si
                JOIN products p ON si.product_id = p.id
                JOIN suppliers s ON si.supplier_id = s.id
                WHERE si.balance > 0
                ORDER BY si.balance DESC`
            );

            res.json(unpaid);

        } catch (error) {
            console.error('Get unpaid balances error:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    // Get total unpaid balance
    getTotalUnpaidBalance: async (req, res) => {
        try {
            const [result] = await pool.query(
                'SELECT COALESCE(SUM(balance), 0) as total_unpaid FROM stock_in WHERE balance > 0'
            );

            res.json({ total_unpaid: result[0].total_unpaid });

        } catch (error) {
            console.error('Get total unpaid error:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    // Get single stock in by ID
    getStockInById: async (req, res) => {
        try {
            const [transactions] = await pool.query(
                `SELECT si.*, p.product_name, p.product_code, s.supplier_name 
                FROM stock_in si
                JOIN products p ON si.product_id = p.id
                JOIN suppliers s ON si.supplier_id = s.id
                WHERE si.id = ?`,
                [req.params.id]
            );

            if (transactions.length === 0) {
                return res.status(404).json({ error: 'Transaction not found' });
            }

            res.json(transactions[0]);
        } catch (error) {
            console.error('Get stock in error:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },
};

module.exports = stockInController;