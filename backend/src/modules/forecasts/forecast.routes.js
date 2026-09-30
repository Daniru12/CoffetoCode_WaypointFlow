const express = require('express');
const router = express.Router();
const forecastController = require('./forecast.controller');
const { authenticate } = require('../../middlewares/auth.middleware');

router.use(authenticate);

router.get('/capacity', forecastController.getCapacityForecasts);
router.get('/capacity/:week', forecastController.getCapacityByWeek);
router.get('/demand', forecastController.getDemandForecast);
router.post('/import', forecastController.importForecasts);

module.exports = router;
