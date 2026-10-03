const express = require('express');
const router = express.Router();
const vehicleController = require('./vehicle.controller');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');

router.use(authenticate);

router.get('/', vehicleController.getVehicles);
router.post('/', authorize('ADMIN'), vehicleController.createVehicle);
router.get('/:id', vehicleController.getVehicleById);
router.patch('/:id/status', vehicleController.updateVehicleStatus);
router.put('/:id', authorize('ADMIN'), vehicleController.updateVehicle);

module.exports = router;
