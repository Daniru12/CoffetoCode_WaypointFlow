const express = require('express');
const router = express.Router();
const syncController = require('./sync.controller');
const { authenticate } = require('../../middlewares/auth.middleware');

router.use(authenticate);

router.get('/bootstrap', syncController.bootstrapOfflineData);
router.post('/events', syncController.processSyncEvents);
router.get('/status', syncController.getSyncStatus);
router.post('/retry', syncController.retrySync);
router.get('/conflicts', syncController.getConflicts);
router.post('/conflicts/:id/resolve', syncController.resolveConflict);

module.exports = router;
