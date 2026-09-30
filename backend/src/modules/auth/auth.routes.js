const express = require('express');
const { login, getMe } = require('./auth.controller');
const { authenticate } = require('../../middlewares/auth.middleware');

const router = express.Router();

router.post('/login', login);
router.get('/me', authenticate, getMe);

module.exports = router;
