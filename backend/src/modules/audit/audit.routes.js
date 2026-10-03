const express = require('express');
const router = express.Router();
const auditController = require('./audit.controller');
const { authenticate } = require('../../middlewares/auth.middleware');

router.use(authenticate);

router.get('/', auditController.getAuditLogs);

module.exports = router;
