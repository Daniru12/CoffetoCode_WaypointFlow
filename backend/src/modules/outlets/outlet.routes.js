const express = require('express');
const { getOutlets, getOutletById } = require('./outlet.controller');
const { authenticate } = require('../../middlewares/auth.middleware');

const router = express.Router();

// Allow public or authenticated read for outlets
router.get('/', authenticate, getOutlets);
router.get('/:id', authenticate, getOutletById);

module.exports = router;
