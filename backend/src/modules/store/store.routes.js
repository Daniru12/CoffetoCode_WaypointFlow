const express = require('express');
const router = express.Router();
const storeController = require('./store.controller');
const { authenticate } = require('../../middlewares/auth.middleware');

router.use(authenticate);

router.get('/my-outlets', storeController.getMyOutlets);
router.get('/my-outlets', storeController.getMyOutlets);
router.get('/dashboard', storeController.getStoreDashboard);

// Replenishment Plans
router.get('/replenishment-plans', storeController.getReplenishmentPlans);
router.post('/replenishment-plans', storeController.createReplenishmentPlan);
router.put('/replenishment-plans/:id', storeController.updateReplenishmentPlan);
router.delete('/replenishment-plans/:id', storeController.deleteReplenishmentPlan);

module.exports = router;
