const pool = require('../config/db');
const { validationResult } = require('express-validator');

const stockOutController = {
    // Create stock out transaction
    createStockOut: async (req, res) => {
        const connection = await pool.getConnection();
        
        try {
            await connection.beginTransaction();

            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                await connection.rollback();
                return res.status(400).json({ errors: errors.array() });
            }

            const { product_id, quantity, date, notes } = req.body;

            // Check current stock
            const [products] = await connection.query(
                'SELECT quantity FROM products WHERE id = ?',
                [product_id]
            );

            if (products.length === 0) {
                await connection.rollback();
                return res.status(404).json({ error: 'Product not found' });
            }

            const currentQuantity = products[0].quantity;

            if (currentQuantity < quantity) {
                await connection.rollback();
                return res.status(400).json({ 
                    error: 'Insufficient stock',
                    available: currentQuantity,
                    requested: quantity
                });
            }

            // Insert stock out record
            const [result] = await connection.query(
                'INSERT INTO stock_out (product_id, quantity, date, notes) VALUES (?, ?, ?, ?)',
                [product_id, quantity, date, notes]
            );

            // Update product quantity
            await connection.query(
                'UPDATE products SET quantity = quantity - ? WHERE id = ?',
                [quantity, product_id]
            );

            await connection.commit();

            // Get created record
            const [newStockOut] = await connection.query(
                `SELECT so.*, p.product_name, p.product_code
                FROM stock_out so
                JOIN products p ON so.product_id = p.id
                WHERE so.id = ?`,
                [result.insertId]
            );

            res.status(201).json(newStockOut[0]);

        } catch (error) {
            await connection.rollback();
            console.error('Create stock out error:', error);
            res.status(500).json({ error: 'Server error' });
        } finally {
            connection.release();
        }
    },

    // Get all stock out transactions
    getAllStockOut: async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const offset = (page - 1) * limit;

            const [transactions] = await pool.query(
                `SELECT so.*, p.product_name, p.product_code
                FROM stock_out so
                JOIN products p ON so.product_id = p.id
                ORDER BY so.created_at DESC
                LIMIT ? OFFSET ?`,
                [limit, offset]
            );

            const [totalResult] = await pool.query(
                'SELECT COUNT(*) as total FROM stock_out'
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
            console.error('Get stock out error:', error);
            res.status(500).json({ error: 'Server error' });
        }
    }
};

module.exports = stockOutController;