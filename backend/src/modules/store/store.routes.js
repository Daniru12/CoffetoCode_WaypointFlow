const express = require('express');
const router = express.Router();
const storeController = require('./store.controller');
const { authenticate } = require('../../middlewares/auth.middleware');

router.use(authenticate);

router.get('/dashboard', storeController.getStoreDashboard);

module.exports = router;
