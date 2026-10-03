const express = require('express');
const router = express.Router();
const userController = require('./user.controller');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');

router.use(authenticate);

router.get('/', userController.getUsers);
router.get('/drivers', userController.getDrivers);
router.get('/loaders', userController.getLoaders);

// Admin-only management endpoints
router.put('/:id', authorize('ADMIN'), userController.updateUser);
router.patch('/:id/status', authorize('ADMIN'), userController.toggleUserStatus);
router.post('/:id/reset-password', authorize('ADMIN'), userController.resetUserPassword);

module.exports = router;
