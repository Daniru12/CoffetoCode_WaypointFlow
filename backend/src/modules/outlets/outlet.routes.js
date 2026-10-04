const express = require('express');
const router = express.Router();
const outletController = require('./outlet.controller');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');

router.use(authenticate);

// Admin-only: Store Manager assignment endpoints (must be before /:id)
router.get('/store-managers', authorize('ADMIN'), outletController.getStoreManagers);
router.post('/assign', authorize('ADMIN'), outletController.bulkAssignManager);
router.post('/unassign', authorize('ADMIN'), outletController.removeManagerFromOutlets);

// General outlet endpoints
router.get('/', outletController.getOutlets);
router.post('/', outletController.createOutlet);
router.get('/:id', outletController.getOutletById);

module.exports = router;
