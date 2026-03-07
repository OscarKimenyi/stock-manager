-- Create database
CREATE DATABASE IF NOT EXISTS stock_management;
USE stock_management;

-- Users table
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products table
CREATE TABLE products (
    id INT PRIMARY KEY AUTO_INCREMENT,
    product_name VARCHAR(100) NOT NULL,
    product_code VARCHAR(50) UNIQUE NOT NULL,
    unit_type ENUM('Piece', 'Roll', 'Bundle', 'Kg') NOT NULL,
    quantity INT DEFAULT 0,
    minimum_stock_level INT DEFAULT 5,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_product_code (product_code),
    INDEX idx_product_name (product_name)
);

-- Suppliers table
CREATE TABLE suppliers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    supplier_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_supplier_name (supplier_name)
);

-- Stock In table (Purchases)
CREATE TABLE stock_in (
    id INT PRIMARY KEY AUTO_INCREMENT,
    product_id INT NOT NULL,
    supplier_id INT NOT NULL,
    quantity INT NOT NULL,
    buying_price DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(10,2) GENERATED ALWAYS AS (quantity * buying_price) STORED,
    amount_paid DECIMAL(10,2) DEFAULT 0,
    balance DECIMAL(10,2) GENERATED ALWAYS AS (total_amount - amount_paid) STORED,
    payment_status ENUM('Paid', 'Partial', 'Unpaid') GENERATED ALWAYS AS (
        CASE 
            WHEN amount_paid >= (quantity * buying_price) THEN 'Paid'
            WHEN amount_paid > 0 THEN 'Partial'
            ELSE 'Unpaid'
        END
    ) STORED,
    payment_method ENUM('Cash', 'Bank', 'Mobile Money') NOT NULL,
    receipt_file VARCHAR(255),
    purchase_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
    INDEX idx_purchase_date (purchase_date),
    INDEX idx_payment_status (payment_status)
);

-- Stock Out table
CREATE TABLE stock_out (
    id INT PRIMARY KEY AUTO_INCREMENT,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_stock_out_date (date)
);

-- Insert default admin user (password: )
INSERT INTO users (username, password) 
VALUES ('admin', '$2b$10$YourHashedPasswordHere');