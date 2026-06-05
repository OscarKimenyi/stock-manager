const express = require("express");
const session = require("express-session");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

// Use PostgreSQL instead of MySQL
const pool = require("./config/db-pg");

const app = express();

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "../frontend")));
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: "lax",
    },
  }),
);

// Make pool available to routes
app.use((req, res, next) => {
  req.db = pool;
  next();
});

// Routes
app.use("/api/auth", require("./routes/registrationRoutes"));
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/products", require("./routes/productRoutes"));
app.use("/api/suppliers", require("./routes/supplierRoutes"));
app.use("/api/stock-in", require("./routes/stockInRoutes"));
app.use("/api/stock-out", require("./routes/stockOutRoutes"));
app.use("/api/reports", require("./routes/reportRoutes"));
app.use("/api/payments", require("./routes/paymentRoutes"));

// Serve frontend pages
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/login.html"));
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/login.html"));
});

app.get("/signup", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/signup.html"));
});

app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/dashboard.html"));
});

app.get("/products", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/products.html"));
});

app.get("/suppliers", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/suppliers.html"));
});

app.get("/stock-in", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/stock-in.html"));
});

app.get("/stock-out", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/stock-out.html"));
});

app.get("/reports", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/reports.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
});
