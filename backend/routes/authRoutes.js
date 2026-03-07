const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');

// Login validation
const loginValidation = [
    body('username').notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required')
];

router.post('/login', loginValidation, authController.login);
router.post('/logout', authController.logout);
router.get('/check', authController.checkAuth);

module.exports = router;