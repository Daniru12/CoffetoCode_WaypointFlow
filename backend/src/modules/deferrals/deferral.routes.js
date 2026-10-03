const express = require('express');
const router = express.Router();
const deferralController = require('./deferral.controller');
const { authenticate } = require('../../middlewares/auth.middleware');

router.use(authenticate);

router.get('/', deferralController.getDeferrals);
router.get('/:id', deferralController.getDeferralById);
router.post('/orders/:orderId/defer', deferralController.deferOrder);
router.post('/:id/reconsider', deferralController.reconsiderDeferral);
router.post('/:id/resolve', deferralController.resolveDeferral);

module.exports = router;
