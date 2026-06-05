const pool = require("../config/db");
const bcrypt = require("bcryptjs");
const { validationResult } = require("express-validator");

const authController = {
  // Login
  login: async (req, res) => {
    try {
      const { username, password } = req.body;

      const [users] = await pool.query(
        `SELECT u.*, c.company_name 
            FROM users u
            JOIN companies c ON u.company_id = c.id
            WHERE (u.username = ? OR u.email = ?) AND u.is_active = TRUE`,
        [username, username],
      );

      if (users.length === 0) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const user = users[0];

      const isValidPassword = await bcrypt.compare(password, user.password);

      if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Set session with company ID
      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.fullName = user.full_name;
      req.session.companyId = user.company_id; // CRITICAL: This filters data
      req.session.role = user.role;

      await pool.query("UPDATE users SET last_login = NOW() WHERE id = ?", [
        user.id,
      ]);

      res.json({
        success: true,
        message: "Login successful",
        user: {
          id: user.id,
          username: user.username,
          fullName: user.full_name,
          role: user.role,
          company: user.company_name,
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Server error" });
    }
  },

  // Logout
  logout: async (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Could not log out" });
      }
      res.json({ success: true, message: "Logout successful" });
    });
  },

  // Check auth status
  checkAuth: async (req, res) => {
    if (req.session && req.session.userId) {
      res.json({
        authenticated: true,
        user: { id: req.session.userId, username: req.session.username },
      });
    } else {
      res.json({ authenticated: false });
    }
  },
};

module.exports = authController;
