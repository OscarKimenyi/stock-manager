const mysql = require("mysql2/promise");
require("dotenv").config();

async function runMigration() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    await connection.execute(
      `CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`,
    );
    await connection.execute(`USE ${process.env.DB_NAME}`);

    // Create companies table
    await connection.execute(`
            CREATE TABLE IF NOT EXISTS companies (
                id INT PRIMARY KEY AUTO_INCREMENT,
                company_name VARCHAR(100) NOT NULL,
                business_type VARCHAR(50),
                phone VARCHAR(20),
                email VARCHAR(100),
                address TEXT,
                subscription_plan ENUM('Basic', 'Professional', 'Enterprise') DEFAULT 'Basic',
                subscription_status ENUM('Active', 'Inactive', 'Suspended') DEFAULT 'Active',
                subscription_start DATE,
                subscription_end DATE,
                logo_url VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_company_name (company_name)
            )
        `);

    console.log("Companies table created");

    // Add company_id to users table
    try {
      await connection.execute(
        `ALTER TABLE users ADD COLUMN company_id INT AFTER id`,
      );
      await connection.execute(
        `ALTER TABLE users ADD FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE`,
      );
    } catch (e) {
      console.log("Company_id column may already exist:", e.message);
    }

    // Add role column
    try {
      await connection.execute(
        `ALTER TABLE users ADD COLUMN role ENUM('Admin', 'Manager', 'Staff') DEFAULT 'Admin'`,
      );
      await connection.execute(
        `ALTER TABLE users ADD COLUMN full_name VARCHAR(100)`,
      );
      await connection.execute(
        `ALTER TABLE users ADD COLUMN email VARCHAR(100)`,
      );
      await connection.execute(
        `ALTER TABLE users ADD COLUMN phone VARCHAR(20)`,
      );
      await connection.execute(
        `ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT TRUE`,
      );
      await connection.execute(
        `ALTER TABLE users ADD COLUMN last_login TIMESTAMP NULL`,
      );
    } catch (e) {
      console.log("User columns may already exist:", e.message);
    }

    // Add company_id to other tables
    const tables = [
      "products",
      "suppliers",
      "stock_in",
      "stock_out",
      "payments",
    ];
    for (const table of tables) {
      try {
        await connection.execute(
          `ALTER TABLE ${table} ADD COLUMN company_id INT AFTER id`,
        );
        await connection.execute(
          `ALTER TABLE ${table} ADD FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE`,
        );
        await connection.execute(
          `CREATE INDEX idx_company_${table} ON ${table}(company_id)`,
        );
        console.log(`Updated ${table} table`);
      } catch (e) {
        console.log(`Table ${table} may already have company_id:`, e.message);
      }
    }

    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await connection.end();
  }
}

runMigration();
