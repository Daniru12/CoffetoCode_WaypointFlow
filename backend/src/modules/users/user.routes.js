const express = require('express');
const router = express.Router();
const userController = require('./user.controller');
const { authenticate } = require('../../middlewares/auth.middleware');

router.use(authenticate);

router.get('/', userController.getUsers);
router.get('/drivers', userController.getDrivers);
router.get('/loaders', userController.getLoaders);

module.exports = router;
