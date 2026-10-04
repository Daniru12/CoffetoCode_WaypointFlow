const express = require('express');
const router = express.Router();
const multer = require('multer');
const inventoryController = require('./inventory.controller');

const upload = multer({ dest: 'uploads/' });

router.get('/', inventoryController.getAllItems);
router.post('/upload', upload.single('file'), inventoryController.uploadCSV);
router.post('/load', inventoryController.loadGoods);
router.post('/issue', inventoryController.reportIssue);

// Store Manager Inventory & Requests
router.get('/store-inventory', inventoryController.getStoreManagerInventory);
router.post('/stock-request', inventoryController.requestStock);
router.get('/stock-requests', inventoryController.getStockRequests);
router.put('/stock-requests/:requestId/approve', inventoryController.approveStockRequest);
router.put('/stock-requests/:requestId/reject', inventoryController.rejectStockRequest);
router.put('/stock-requests/:requestId/send', inventoryController.markStockRequestSent);
router.put('/stock-requests/:requestId/receive', inventoryController.confirmStockReceived);

module.exports = router;
