const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');

const authController = {
    // Login
    login: async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { username, password } = req.body;

            // Get user from database
            const [users] = await pool.query(
                'SELECT * FROM users WHERE username = ?',
                [username]
            );

            if (users.length === 0) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            const user = users[0];

            // Compare password
            const isValidPassword = await bcrypt.compare(password, user.password);
            
            if (!isValidPassword) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            // Set session
            req.session.userId = user.id;
            req.session.username = user.username;

            res.json({ 
                success: true, 
                message: 'Login successful',
                user: { id: user.id, username: user.username }
            });

        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    // Logout
    logout: async (req, res) => {
        req.session.destroy((err) => {
            if (err) {
                return res.status(500).json({ error: 'Could not log out' });
            }
            res.json({ success: true, message: 'Logout successful' });
        });
    },

    // Check auth status
    checkAuth: async (req, res) => {
        if (req.session && req.session.userId) {
            res.json({ 
                authenticated: true, 
                user: { id: req.session.userId, username: req.session.username }
            });
        } else {
            res.json({ authenticated: false });
        }
    }
};

module.exports = authController;