const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');

router.post('/register', authenticate, authorize('ADMIN'), authController.register);
router.post('/login', authController.login);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.getMe);
router.post('/refresh', authController.refresh);
router.put('/password', authenticate, authController.changePassword);

module.exports = router;
