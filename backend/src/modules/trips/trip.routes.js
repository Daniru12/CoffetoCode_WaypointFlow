const express = require('express');
const router = express.Router();
const tripController = require('./trip.controller');
const { authenticate } = require('../../middlewares/auth.middleware');

router.use(authenticate);

router.get('/', tripController.getTrips);
router.get('/:tripId', tripController.getTripById);
router.post('/:tripId/start', tripController.startTrip);
router.post('/:tripId/complete', tripController.completeTrip);
router.post('/:tripId/assign-driver', tripController.assignDriver);
router.patch('/:tripId/reorder-stops', tripController.reorderTripStops);
router.post('/:tripId/unassign-order', tripController.unassignTripOrder);
router.post('/:tripId/reassign-vehicle', tripController.reassignVehicle);
router.post('/:tripId/defer-remaining-orders', tripController.deferRemainingOrders);

module.exports = router;
