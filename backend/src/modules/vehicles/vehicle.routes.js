const express = require('express');
const { getVehicles, getVehicleById } = require('./vehicle.controller');
const { authenticate } = require('../../middlewares/auth.middleware');

const router = express.Router();

router.get('/', authenticate, getVehicles);
router.get('/:id', authenticate, getVehicleById);

module.exports = router;
