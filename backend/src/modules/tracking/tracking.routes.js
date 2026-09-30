const express = require('express');
const router = express.Router();
const trackingController = require('./tracking.controller');
const { authenticate } = require('../../middlewares/auth.middleware');

router.use(authenticate);

router.get('/live', trackingController.getLiveTracking);
router.get('/trips/:tripId', trackingController.getTripTracking);
router.post('/location', trackingController.recordLocation);

module.exports = router;
