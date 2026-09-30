const express = require('express');
const { createOrder, getOrders, getOrderById } = require('./order.controller');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');

const router = express.Router();

router.use(authenticate);

router.post('/', authorize('STORE_MANAGER', 'DISPATCHER'), createOrder);
router.get('/', getOrders);
router.get('/:id', getOrderById);

module.exports = router;
