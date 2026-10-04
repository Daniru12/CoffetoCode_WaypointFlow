const express = require('express');
const router = express.Router();
const simulationController = require('./simulation.controller');
const { authenticate } = require('../../middlewares/auth.middleware');

router.get('/time', simulationController.getSimulationTime);
router.post('/time', authenticate, simulationController.setSimulationTime);
router.post('/time/reset', authenticate, simulationController.resetSimulationTime);

module.exports = router;
