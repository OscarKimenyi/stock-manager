const pool = require('../config/db');

const User = {
    // Create new user
    async create(userData) {
        const { username, password } = userData;
        const [result] = await pool.query(
            'INSERT INTO users (username, password) VALUES (?, ?)',
            [username, password]
        );
        return result.insertId;
    },

    // Find user by username
    async findByUsername(username) {
        const [users] = await pool.query(
            'SELECT * FROM users WHERE username = ?',
            [username]
        );
        return users[0];
    },

    // Find user by ID
    async findById(id) {
        const [users] = await pool.query(
            'SELECT id, username, created_at FROM users WHERE id = ?',
            [id]
        );
        return users[0];
    },

    // Update last login
    async updateLastLogin(id) {
        await pool.query(
            'UPDATE users SET last_login = NOW() WHERE id = ?',
            [id]
        );
    },

    // Change password
    async changePassword(id, newPassword) {
        await pool.query(
            'UPDATE users SET password = ? WHERE id = ?',
            [newPassword, id]
        );
    }
};

module.exports = User;