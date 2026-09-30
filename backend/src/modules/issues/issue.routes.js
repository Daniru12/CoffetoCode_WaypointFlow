const express = require('express');
const router = express.Router();
const issueController = require('./issue.controller');
const { authenticate } = require('../../middlewares/auth.middleware');

router.use(authenticate);

router.get('/', issueController.getIssues);
router.get('/:id', issueController.getIssueById);
router.patch('/:id', issueController.updateIssueStatus);

module.exports = router;
