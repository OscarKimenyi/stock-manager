// backend/routes/registrationRoutes.js
const express = require("express");
const router = express.Router();
const registrationController = require("../controllers/registrationController");

// Public routes only - no subscription needed
router.get("/check-username", registrationController.checkUsername);
router.post("/register", registrationController.registerCompany);

module.exports = router;
