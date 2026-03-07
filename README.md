# Stock Management System

A professional, production-ready Stock Management System built with Node.js, Express, MySQL, and Bootstrap 5. This system helps businesses efficiently manage their inventory, track stock movements, manage suppliers, and handle purchase payments.

![Dashboard Preview](https://res.cloudinary.com/dhyo79gy1/image/upload/v1772892336/stock-dashboard_xzsmw2.png)

## 📋 Features

### Core Features
- **🔐 Secure Authentication System**
  - Password hashing with bcrypt
  - Session-based authentication
  - Protected routes
  - Login/Logout functionality

- **📊 Professional Dashboard**
  - Real-time statistics cards
  - Recent transactions overview
  - Low stock alerts
  - Quick access to all modules

- **📦 Product Management**
  - Add, edit, delete products
  - Track product codes and unit types
  - Monitor current stock levels
  - Set minimum stock levels for alerts
  - Search and pagination

- **🤝 Supplier Management**
  - Complete supplier profiles
  - Contact information storage
  - Purchase history tracking
  - Supplier performance monitoring

- **⬇️ Stock-In Management**
  - Record purchases with receipt upload
  - Automatic total amount calculation
  - Payment tracking (Paid/Partial/Unpaid)
  - Multiple payment methods
  - Real-time stock quantity updates
  - File upload support (images/PDF)

- **⬆️ Stock-Out Management**
  - Track items leaving the store
  - Automatic stock validation
  - Prevents negative stock levels
  - Transaction logging

- **💰 Unpaid Balance Tracking**
  - Automatic balance calculation
  - Payment status monitoring
  - Filter unpaid purchases
  - Supplier-wise balance view

- **📈 Comprehensive Reports**
  - Current Stock Report
  - Stock-In Report
  - Stock-Out Report
  - Supplier Purchase Report
  - Unpaid Purchase Report
  - Low Stock Report
  - Date and supplier filtering

## 🛠️ Technology Stack

### Frontend
- **HTML5** - Structure
- **CSS3** - Styling
- **Bootstrap 5** - Responsive design
- **Vanilla JavaScript** - Client-side logic
- **Font Awesome 6** - Icons

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MySQL** - Database
- **Express Session** - Authentication
- **Bcryptjs** - Password hashing
- **Multer** - File uploads
- **Express Validator** - Input validation

## 📁 Project Structure

```
stock-management-system/
│
├── backend/
│   ├── config/
│   │   └── db.js                 # Database configuration
│   ├── controllers/               # Business logic
│   │   ├── authController.js
│   │   ├── productController.js
│   │   ├── supplierController.js
│   │   ├── stockInController.js
│   │   ├── stockOutController.js
│   │   └── reportController.js
│   ├── models/                    # Database models
│   │   ├── User.js
│   │   ├── Product.js
│   │   ├── Supplier.js
│   │   ├── StockIn.js
│   │   └── StockOut.js
│   ├── routes/                    # API routes
│   │   ├── authRoutes.js
│   │   ├── productRoutes.js
│   │   ├── supplierRoutes.js
│   │   ├── stockInRoutes.js
│   │   ├── stockOutRoutes.js
│   │   └── reportRoutes.js
│   ├── middleware/                 # Custom middleware
│   │   ├── auth.js
│   │   └── upload.js
│   ├── public/
│   │   └── uploads/
│   │       └── receipts/          # Uploaded files
│   ├── .env                        # Environment variables
│   └── server.js                    # Main application file
│
├── frontend/
│   ├── index.html                   # Landing/Login page
│   ├── login.html                    # Login page
│   ├── dashboard.html                 # Dashboard
│   ├── products.html                  # Product management
│   ├── suppliers.html                  # Supplier management
│   ├── stock-in.html                    # Stock in form
│   ├── stock-out.html                   # Stock out form
│   ├── reports.html                     # Reports page
│   ├── css/
│   │   └── style.css                    # Custom styles
│   └── js/
│       ├── api.js                        # API wrapper
│       ├── auth.js                       # Authentication logic
│       ├── dashboard.js                   # Dashboard functionality
│       ├── products.js                     # Product operations
│       ├── suppliers.js                     # Supplier operations
│       ├── stock-in.js                       # Stock in operations
│       ├── stock-out.js                       # Stock out operations
│       └── reports.js                         # Report generation
│
├── package.json
└── README.md
```

## 🚀 Installation Guide

### Prerequisites
- Node.js (v14 or higher)
- MySQL (v5.7 or higher)
- npm or yarn package manager

### Step 1: Clone the Repository
```bash
git clone https://github.com/yourusername/stock-manager.git
cd stock-manager
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Database Setup

1. **Create MySQL Database**
```sql
CREATE DATABASE stock_management;
USE stock_management;
```

2. **Run the Schema**
Execute the SQL schema provided in the documentation to create all tables.

3. **Create Admin User**
Generate a hashed password:
```javascript
const bcrypt = require('bcryptjs');
const password = 'admin123';
const hashedPassword = bcrypt.hashSync(password, 10);
console.log(hashedPassword);
```

Insert admin user:
```sql
INSERT INTO users (username, password) VALUES ('admin', 'your_hashed_password_here');
```

### Step 4: Configure Environment Variables

Create a `.env` file in the backend directory:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=stock_management
SESSION_SECRET=your_super_secret_session_key_here
PORT=3000
```

### Step 5: Create Upload Directory

```bash
mkdir -p backend/public/uploads/receipts
```

### Step 6: Run the Application

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

### Step 7: Access the Application

Open your browser and navigate to:
```
http://localhost:3000
```

Default login credentials:
- **Username:** admin
- **Password:** admin123

## 📊 Database Schema

### Users Table
```sql
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Products Table
```sql
CREATE TABLE products (
    id INT PRIMARY KEY AUTO_INCREMENT,
    product_name VARCHAR(100) NOT NULL,
    product_code VARCHAR(50) UNIQUE NOT NULL,
    unit_type ENUM('Piece', 'Roll', 'Bundle', 'Kg') NOT NULL,
    quantity INT DEFAULT 0,
    minimum_stock_level INT DEFAULT 5,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Suppliers Table
```sql
CREATE TABLE suppliers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    supplier_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Stock In Table
```sql
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
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
);
```

### Stock Out Table
```sql
CREATE TABLE stock_out (
    id INT PRIMARY KEY AUTO_INCREMENT,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);
```

## 🔒 Security Features

- **Password Security**: Passwords hashed using bcrypt
- **Session Management**: Secure session-based authentication
- **Input Validation**: All inputs validated using express-validator
- **SQL Injection Prevention**: Prepared statements used throughout
- **File Upload Security**: File type validation and size limits
- **Environment Variables**: Sensitive data stored in .env
- **Protected Routes**: Authentication middleware for all routes

## 🌟 Key Features Explained

### Stock-In Logic
When recording a stock-in transaction:
1. System validates all input fields
2. Calculates total amount (quantity × buying price)
3. Determines payment status based on amount paid
4. Uploads receipt file (if provided)
5. Automatically updates product quantity
6. Records transaction with supplier details

### Stock-Out Logic
When recording a stock-out:
1. System checks available quantity
2. Prevents transaction if insufficient stock
3. Updates product quantity after successful transaction
4. Records transaction details for audit trail

### Payment Tracking
- Automatic balance calculation
- Real-time payment status updates
- Unpaid balance monitoring
- Supplier-wise payment tracking

### Report Generation
- Filterable reports with date ranges
- Export-ready data format
- Comprehensive summaries
- Low stock alerts

## 🎨 UI/UX Design

- **Modern Dashboard**: Clean, professional interface
- **Responsive Design**: Works on all devices
- **Interactive Elements**: Hover effects, animations
- **Toast Notifications**: User-friendly alerts
- **Modal Forms**: Clean form submissions
- **Loading States**: Visual feedback during operations
- **Error Handling**: Clear error messages

## 🧪 Testing

Run the application and test all features:

1. **Authentication**
   - Login with valid credentials
   - Try accessing protected pages without login
   - Test logout functionality

2. **Product Management**
   - Add new products
   - Edit existing products
   - Delete products
   - Search products
   - Check low stock alerts

3. **Supplier Management**
   - Add suppliers
   - Edit supplier information
   - View purchase history

4. **Stock Operations**
   - Record stock-in with receipt upload
   - Test payment status calculations
   - Record stock-out with validation
   - Verify stock quantity updates

5. **Reports**
   - Generate all report types
   - Apply filters
   - Verify calculations

## 🚦 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/check` - Check authentication status

### Products
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get single product
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product
- `GET /api/products/low-stock` - Get low stock products

### Suppliers
- `GET /api/suppliers` - Get all suppliers
- `GET /api/suppliers/:id` - Get single supplier
- `POST /api/suppliers` - Create supplier
- `PUT /api/suppliers/:id` - Update supplier
- `DELETE /api/suppliers/:id` - Delete supplier
- `GET /api/suppliers/:id/history` - Get purchase history

### Stock In
- `GET /api/stock-in` - Get stock in transactions
- `POST /api/stock-in` - Create stock in
- `GET /api/stock-in/unpaid` - Get unpaid balances
- `GET /api/stock-in/unpaid/total` - Get total unpaid

### Stock Out
- `GET /api/stock-out` - Get stock out transactions
- `POST /api/stock-out` - Create stock out

### Reports
- `GET /api/reports/dashboard` - Dashboard statistics
- `GET /api/reports/current-stock` - Current stock report
- `GET /api/reports/stock-in` - Stock in report
- `GET /api/reports/stock-out` - Stock out report
- `GET /api/reports/supplier-purchases` - Supplier purchase report
- `GET /api/reports/unpaid` - Unpaid report
- `GET /api/reports/low-stock` - Low stock report

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors

- Oscar Kimenyi

## 🙏 Acknowledgments

- Bootstrap team for the amazing framework
- Font Awesome for the icons
- Express.js community
- All contributors who help improve this project

## 📧 Contact

For support or queries, please contact:
- Email: oscarkimenyi49@gmail.com
- GitHub: [@OscarKimenyi](https://github.com/OscarKimenyi)

---

