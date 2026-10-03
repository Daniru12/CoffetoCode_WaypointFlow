const express = require('express');
const router = express.Router();
const outletController = require('./outlet.controller');
const { authenticate } = require('../../middlewares/auth.middleware');

router.use(authenticate);

router.get('/', outletController.getOutlets);
router.post('/', outletController.createOutlet);
router.get('/:id', outletController.getOutletById);

module.exports = router;
