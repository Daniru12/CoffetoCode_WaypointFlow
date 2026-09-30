const express = require('express');
const router = express.Router();
const tripController = require('./trip.controller');
const { authenticate } = require('../../middlewares/auth.middleware');

router.use(authenticate);

router.get('/', tripController.getTrips);
router.get('/:tripId', tripController.getTripById);
router.post('/:tripId/reassign-vehicle', tripController.reassignVehicle);
router.post('/:tripId/defer-remaining-orders', tripController.deferRemainingOrders);

module.exports = router;
