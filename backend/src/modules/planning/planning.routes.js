const express = require('express');
const router = express.Router();
const planningController = require('./planning.controller');
const { authenticate } = require('../../middlewares/auth.middleware');

router.use(authenticate);

router.post('/', planningController.createPlan);
router.get('/', planningController.getPlans);
router.get('/:id', planningController.getPlanById);
router.post('/:id/validate', planningController.validatePlan);
router.post('/:id/publish', planningController.publishPlan);
router.get('/:id/unallocated-orders', planningController.getUnallocatedOrders);

module.exports = router;
