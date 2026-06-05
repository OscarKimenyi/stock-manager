// backend/controllers/registrationController.js - Simplified without subscription
const pool = require("../config/db");
const bcrypt = require("bcryptjs");

const registrationController = {
  // Check username availability
  checkUsername: async (req, res) => {
    try {
      const { username } = req.query;

      if (!username || username.length < 3) {
        return res.json({ available: false });
      }

      const [users] = await pool.query(
        "SELECT id FROM users WHERE username = ?",
        [username],
      );

      res.json({ available: users.length === 0 });
    } catch (error) {
      console.error("Check username error:", error);
      res.status(500).json({ error: "Server error" });
    }
  },

  // Register new company and admin
  registerCompany: async (req, res) => {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const { company, admin } = req.body;

      // Check if username already exists
      const [existingUser] = await connection.query(
        "SELECT id FROM users WHERE username = ?",
        [admin.username],
      );

      if (existingUser.length > 0) {
        await connection.rollback();
        return res
          .status(400)
          .json({ error: "Username already taken. Please choose another." });
      }

      // Check if email already exists
      const [existingEmail] = await connection.query(
        "SELECT id FROM users WHERE email = ?",
        [admin.email],
      );

      if (existingEmail.length > 0) {
        await connection.rollback();
        return res
          .status(400)
          .json({ error: "Email already registered. Please login." });
      }

      // Check if company name exists
      const [existingCompany] = await connection.query(
        "SELECT id FROM companies WHERE company_name = ?",
        [company.company_name],
      );

      if (existingCompany.length > 0) {
        await connection.rollback();
        return res.status(400).json({ error: "Company name already taken" });
      }

      // Insert company (no subscription fields)
      const [companyResult] = await connection.query(
        `INSERT INTO companies 
                (company_name, business_type, phone, email, address) 
                VALUES (?, ?, ?, ?, ?)`,
        [
          company.company_name,
          company.business_type || null,
          company.phone || null,
          company.email || null,
          company.address || null,
        ],
      );

      const companyId = companyResult.insertId;

      // Hash password
      const hashedPassword = await bcrypt.hash(admin.password, 10);

      // Insert admin user
      await connection.query(
        `INSERT INTO users 
                (company_id, username, password, role, full_name, email, phone, is_active) 
                VALUES (?, ?, ?, 'Admin', ?, ?, ?, TRUE)`,
        [
          companyId,
          admin.username,
          hashedPassword,
          admin.full_name,
          admin.email,
          admin.phone || null,
        ],
      );

      await connection.commit();

      res.status(201).json({
        success: true,
        message: "Registration successful",
        company_id: companyId,
      });
    } catch (error) {
      await connection.rollback();
      console.error("Registration error:", error);
      res.status(500).json({ error: "Server error during registration" });
    } finally {
      connection.release();
    }
  },
};

module.exports = registrationController;
