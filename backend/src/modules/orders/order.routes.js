const express = require('express');
const router = express.Router();
const orderController = require('./order.controller');
const { authenticate } = require('../../middlewares/auth.middleware');

router.use(authenticate);

router.post('/', orderController.createOrder);
router.get('/', orderController.getOrders);
router.get('/my', orderController.getMyOrders);
router.get('/queue', orderController.getOrderQueue);
router.get('/:id', orderController.getOrderById);
router.patch('/:id', orderController.updateOrder);
router.delete('/:id', orderController.deleteOrder);
router.get('/:id/tracking', orderController.getOrderTracking);

module.exports = router;
