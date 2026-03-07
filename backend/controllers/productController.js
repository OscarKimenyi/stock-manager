const pool = require('../config/db');
const { validationResult } = require('express-validator');

const productController = {
    // Get all products with pagination and search
    getAllProducts: async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const search = req.query.search || '';
            const offset = (page - 1) * limit;

            let query = 'SELECT * FROM products';
            let countQuery = 'SELECT COUNT(*) as total FROM products';
            let queryParams = [];
            let countParams = [];

            if (search) {
                query += ' WHERE product_name LIKE ? OR product_code LIKE ?';
                countQuery += ' WHERE product_name LIKE ? OR product_code LIKE ?';
                queryParams.push(`%${search}%`, `%${search}%`);
                countParams.push(`%${search}%`, `%${search}%`);
            }

            query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
            queryParams.push(limit, offset);

            const [products] = await pool.query(query, queryParams);
            const [totalResult] = await pool.query(countQuery, countParams);

            // Add low stock flag
            const productsWithStatus = products.map(product => ({
                ...product,
                isLowStock: product.quantity <= product.minimum_stock_level
            }));

            res.json({
                products: productsWithStatus,
                pagination: {
                    page,
                    limit,
                    total: totalResult[0].total,
                    pages: Math.ceil(totalResult[0].total / limit)
                }
            });

        } catch (error) {
            console.error('Get products error:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    // Get single product
    getProduct: async (req, res) => {
        try {
            const [products] = await pool.query(
                'SELECT * FROM products WHERE id = ?',
                [req.params.id]
            );

            if (products.length === 0) {
                return res.status(404).json({ error: 'Product not found' });
            }

            res.json(products[0]);

        } catch (error) {
            console.error('Get product error:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    // Create product
    createProduct: async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { product_name, product_code, unit_type, quantity, minimum_stock_level } = req.body;

            // Check if product code exists
            const [existing] = await pool.query(
                'SELECT id FROM products WHERE product_code = ?',
                [product_code]
            );

            if (existing.length > 0) {
                return res.status(400).json({ error: 'Product code already exists' });
            }

            const [result] = await pool.query(
                'INSERT INTO products (product_name, product_code, unit_type, quantity, minimum_stock_level) VALUES (?, ?, ?, ?, ?)',
                [product_name, product_code, unit_type, quantity || 0, minimum_stock_level || 5]
            );

            const [newProduct] = await pool.query(
                'SELECT * FROM products WHERE id = ?',
                [result.insertId]
            );

            res.status(201).json(newProduct[0]);

        } catch (error) {
            console.error('Create product error:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    // Update product
    updateProduct: async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { product_name, unit_type, minimum_stock_level } = req.body;

            // Check if product exists
            const [existing] = await pool.query(
                'SELECT * FROM products WHERE id = ?',
                [req.params.id]
            );

            if (existing.length === 0) {
                return res.status(404).json({ error: 'Product not found' });
            }

            await pool.query(
                'UPDATE products SET product_name = ?, unit_type = ?, minimum_stock_level = ? WHERE id = ?',
                [product_name, unit_type, minimum_stock_level, req.params.id]
            );

            const [updated] = await pool.query(
                'SELECT * FROM products WHERE id = ?',
                [req.params.id]
            );

            res.json(updated[0]);

        } catch (error) {
            console.error('Update product error:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    // Delete product
    deleteProduct: async (req, res) => {
        try {
            const [result] = await pool.query(
                'DELETE FROM products WHERE id = ?',
                [req.params.id]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Product not found' });
            }

            res.json({ success: true, message: 'Product deleted successfully' });

        } catch (error) {
            console.error('Delete product error:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    // Get low stock products
    getLowStockProducts: async (req, res) => {
        try {
            const [products] = await pool.query(
                'SELECT * FROM products WHERE quantity <= minimum_stock_level ORDER BY quantity ASC'
            );

            res.json(products);

        } catch (error) {
            console.error('Get low stock error:', error);
            res.status(500).json({ error: 'Server error' });
        }
    }
};

module.exports = productController;