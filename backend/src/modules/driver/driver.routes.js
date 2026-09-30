const express = require('express');
const router = express.Router();
const deliveryController = require('../deliveries/delivery.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const upload = require('../../middlewares/upload.middleware');

router.use(authenticate);

router.get('/routes/today', deliveryController.getDriverRoutesToday);
router.get('/trips/:tripId', deliveryController.getDriverTripById);
router.get('/trips/:tripId/stops', deliveryController.getTripStops);
router.post('/location', deliveryController.recordDriverLocation);
router.post('/vehicle-issue', upload.array('evidence', 5), deliveryController.reportVehicleIssue);

module.exports = router;
