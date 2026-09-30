const express = require('express');
const router = express.Router();
const loadingController = require('./loading.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const upload = require('../../middlewares/upload.middleware');

router.use(authenticate);

router.get('/jobs/today', loadingController.getJobsToday);
router.get('/jobs/:id', loadingController.getJobById);
router.post('/jobs/:id/start', loadingController.startJob);
router.patch('/jobs/:id/items/:itemId', loadingController.updateItem);
router.post('/jobs/:id/shortfall', upload.array('evidence', 5), loadingController.reportShortfall);
router.post('/jobs/:id/damage', upload.array('evidence', 5), loadingController.reportDamage);
router.post('/jobs/:id/complete', loadingController.completeJob);
router.post('/jobs/:id/ready-for-departure', loadingController.readyForDeparture);

module.exports = router;
