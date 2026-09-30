const express = require('express');
const router = express.Router();
const vehicleController = require('./vehicle.controller');
const { authenticate } = require('../../middlewares/auth.middleware');

router.use(authenticate);

router.get('/', vehicleController.getVehicles);
router.post('/', vehicleController.createVehicle);
router.get('/:id', vehicleController.getVehicleById);
router.patch('/:id/status', vehicleController.updateVehicleStatus);

module.exports = router;
