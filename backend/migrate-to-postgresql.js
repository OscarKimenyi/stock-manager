const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT || 5432,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

async function migrate() {
  try {
    console.log("Starting PostgreSQL migration...");

    // Drop tables if they exist (in correct order to avoid foreign key errors)
    await pool.query(`
            DROP TABLE IF EXISTS payments CASCADE;
            DROP TABLE IF EXISTS stock_out CASCADE;
            DROP TABLE IF EXISTS stock_in CASCADE;
            DROP TABLE IF EXISTS suppliers CASCADE;
            DROP TABLE IF EXISTS products CASCADE;
            DROP TABLE IF EXISTS users CASCADE;
            DROP TABLE IF EXISTS companies CASCADE;
        `);

    console.log("Dropped existing tables");

    // Create companies table
    await pool.query(`
            CREATE TABLE companies (
                id SERIAL PRIMARY KEY,
                company_name VARCHAR(100) NOT NULL,
                business_type VARCHAR(50),
                phone VARCHAR(20),
                email VARCHAR(100),
                address TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
    console.log("✓ Created companies table");

    // Create users table
    await pool.query(`
            CREATE TABLE users (
                id SERIAL PRIMARY KEY,
                company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
                username VARCHAR(50) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                full_name VARCHAR(100),
                email VARCHAR(100),
                phone VARCHAR(20),
                role VARCHAR(20) DEFAULT 'Admin',
                is_active BOOLEAN DEFAULT TRUE,
                last_login TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
    console.log("✓ Created users table");

    // Create products table
    await pool.query(`
            CREATE TABLE products (
                id SERIAL PRIMARY KEY,
                company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
                product_name VARCHAR(100) NOT NULL,
                product_code VARCHAR(50) NOT NULL,
                unit_type VARCHAR(20) NOT NULL,
                quantity INTEGER DEFAULT 0,
                minimum_stock_level INTEGER DEFAULT 5,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(company_id, product_code)
            )
        `);
    console.log("✓ Created products table");

    // Create suppliers table
    await pool.query(`
            CREATE TABLE suppliers (
                id SERIAL PRIMARY KEY,
                company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
                supplier_name VARCHAR(100) NOT NULL,
                phone VARCHAR(20),
                email VARCHAR(100),
                address TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
    console.log("✓ Created suppliers table");

    // Create stock_in table
    await pool.query(`
            CREATE TABLE stock_in (
                id SERIAL PRIMARY KEY,
                company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
                product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
                supplier_id INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
                quantity INTEGER NOT NULL,
                buying_price DECIMAL(10,2) NOT NULL,
                total_amount DECIMAL(10,2) GENERATED ALWAYS AS (quantity * buying_price) STORED,
                amount_paid DECIMAL(10,2) DEFAULT 0,
                balance DECIMAL(10,2) GENERATED ALWAYS AS (total_amount - amount_paid) STORED,
                payment_status VARCHAR(20) GENERATED ALWAYS AS (
                    CASE 
                        WHEN amount_paid >= (quantity * buying_price) THEN 'Paid'
                        WHEN amount_paid > 0 THEN 'Partial'
                        ELSE 'Unpaid'
                    END
                ) STORED,
                payment_method VARCHAR(20) NOT NULL,
                receipt_file VARCHAR(255),
                purchase_date DATE NOT NULL,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
    console.log("✓ Created stock_in table");

    // Create stock_out table
    await pool.query(`
            CREATE TABLE stock_out (
                id SERIAL PRIMARY KEY,
                company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
                product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
                quantity INTEGER NOT NULL,
                date DATE NOT NULL,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
    console.log("✓ Created stock_out table");

    // Create payments table
    await pool.query(`
            CREATE TABLE payments (
                id SERIAL PRIMARY KEY,
                company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
                stock_in_id INTEGER NOT NULL REFERENCES stock_in(id) ON DELETE CASCADE,
                amount DECIMAL(10,2) NOT NULL,
                payment_method VARCHAR(20) NOT NULL,
                payment_date DATE NOT NULL,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
    console.log("✓ Created payments table");

    // Create indexes for better performance
    await pool.query(`
            CREATE INDEX idx_users_company ON users(company_id);
            CREATE INDEX idx_users_username ON users(username);
            CREATE INDEX idx_products_company ON products(company_id);
            CREATE INDEX idx_products_code ON products(product_code);
            CREATE INDEX idx_suppliers_company ON suppliers(company_id);
            CREATE INDEX idx_stockin_company ON stock_in(company_id);
            CREATE INDEX idx_stockin_product ON stock_in(product_id);
            CREATE INDEX idx_stockin_supplier ON stock_in(supplier_id);
            CREATE INDEX idx_stockin_date ON stock_in(purchase_date);
            CREATE INDEX idx_stockout_company ON stock_out(company_id);
            CREATE INDEX idx_stockout_product ON stock_out(product_id);
            CREATE INDEX idx_stockout_date ON stock_out(date);
            CREATE INDEX idx_payments_company ON payments(company_id);
            CREATE INDEX idx_payments_stockin ON payments(stock_in_id);
        `);
    console.log("✓ Created indexes");

    console.log("Migration completed successfully!");
    console.log("PostgreSQL database is ready for use.");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await pool.end();
  }
}

migrate();
