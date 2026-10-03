const express = require('express');
const router = express.Router();
const deliveryController = require('./delivery.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const upload = require('../../middlewares/upload.middleware');

router.use(authenticate);

router.get('/:deliveryId', deliveryController.getDeliveryById);
router.post('/:deliveryId/arrive', deliveryController.arriveDelivery);
router.post('/:deliveryId/complete', deliveryController.completeDelivery);
router.post('/:deliveryId/fail', deliveryController.failDelivery);

router.post(
  '/:deliveryId/pod',
  upload.fields([
    { name: 'signature', maxCount: 1 },
    { name: 'photos', maxCount: 5 }
  ]),
  deliveryController.submitPod
);

router.post(
  '/:deliveryId/receipt',
  upload.array('evidence', 5),
  deliveryController.confirmReceipt
);

router.post(
  '/:deliveryId/issues',
  upload.array('evidence', 5),
  deliveryController.reportDeliveryIssue
);

module.exports = router;
