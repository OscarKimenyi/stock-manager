const pool = require('../config/db');

const Product = {
    // Create new product
    async create(productData) {
        const { product_name, product_code, unit_type, quantity, minimum_stock_level } = productData;
        const [result] = await pool.query(
            'INSERT INTO products (product_name, product_code, unit_type, quantity, minimum_stock_level) VALUES (?, ?, ?, ?, ?)',
            [product_name, product_code, unit_type, quantity || 0, minimum_stock_level || 5]
        );
        return result.insertId;
    },

    // Find all products with pagination
    async findAll(options = {}) {
        const { page = 1, limit = 10, search = '' } = options;
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

        return {
            products,
            pagination: {
                page,
                limit,
                total: totalResult[0].total,
                pages: Math.ceil(totalResult[0].total / limit)
            }
        };
    },

    // Find product by ID
    async findById(id) {
        const [products] = await pool.query(
            'SELECT * FROM products WHERE id = ?',
            [id]
        );
        return products[0];
    },

    // Find by product code
    async findByCode(productCode) {
        const [products] = await pool.query(
            'SELECT * FROM products WHERE product_code = ?',
            [productCode]
        );
        return products[0];
    },

    // Update product
    async update(id, productData) {
        const { product_name, unit_type, minimum_stock_level } = productData;
        await pool.query(
            'UPDATE products SET product_name = ?, unit_type = ?, minimum_stock_level = ? WHERE id = ?',
            [product_name, unit_type, minimum_stock_level, id]
        );
        return this.findById(id);
    },

    // Delete product
    async delete(id) {
        const [result] = await pool.query(
            'DELETE FROM products WHERE id = ?',
            [id]
        );
        return result.affectedRows > 0;
    },

    // Update quantity
    async updateQuantity(id, quantityChange) {
        await pool.query(
            'UPDATE products SET quantity = quantity + ? WHERE id = ?',
            [quantityChange, id]
        );
    },

    // Get low stock products
    async findLowStock() {
        const [products] = await pool.query(
            'SELECT * FROM products WHERE quantity <= minimum_stock_level ORDER BY quantity ASC'
        );
        return products;
    },

    // Check if product code exists
    async codeExists(productCode, excludeId = null) {
        let query = 'SELECT id FROM products WHERE product_code = ?';
        const params = [productCode];

        if (excludeId) {
            query += ' AND id != ?';
            params.push(excludeId);
        }

        const [result] = await pool.query(query, params);
        return result.length > 0;
    },

    // Get total stock value
    async getTotalStockValue() {
        const [result] = await pool.query(
            'SELECT COALESCE(SUM(quantity), 0) as total FROM products'
        );
        return result[0].total;
    },

    // Get product count
    async getCount() {
        const [result] = await pool.query('SELECT COUNT(*) as count FROM products');
        return result[0].count;
    }
};

module.exports = Product;