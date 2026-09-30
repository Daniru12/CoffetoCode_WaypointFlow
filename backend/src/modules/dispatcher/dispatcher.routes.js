const express = require('express');
const router = express.Router();
const dispatcherController = require('./dispatcher.controller');
const { authenticate } = require('../../middlewares/auth.middleware');

router.use(authenticate);

router.get('/dashboard', dispatcherController.getDispatcherDashboard);
router.get('/alerts', dispatcherController.getDispatcherAlerts);
router.get('/critical-incidents', dispatcherController.getCriticalIncidents);

module.exports = router;
