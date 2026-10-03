const express = require('express');
const router = express.Router();
const allocationController = require('./allocation.controller');
const { authenticate } = require('../../middlewares/auth.middleware');

router.use(authenticate);

router.get('/orders/:orderId/compatible-vehicles', allocationController.getCompatibleVehicles);
router.post('/validate', allocationController.validateAllocation);
router.post('/assign', allocationController.assignOrder);
router.patch('/:assignmentId', allocationController.updateAssignment);
router.delete('/:assignmentId', allocationController.removeAssignment);

module.exports = router;
