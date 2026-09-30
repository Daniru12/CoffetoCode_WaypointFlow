const Issue = require('./issue.model');
const ApiResponse = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const auditService = require('../../services/audit.service');

const getIssues = asyncHandler(async (req, res) => {
  const { type, severity, status } = req.query;
  const filter = {};
  if (type) filter.type = type;
  if (severity) filter.severity = severity;
  if (status) filter.status = status;

  const issues = await Issue.find(filter)
    .populate('order delivery trip vehicle reportedBy', '-password')
    .sort({ createdAt: -1 });

  res.status(200).json(new ApiResponse(200, issues, `Retrieved ${issues.length} issues`));
});

const getIssueById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const issue = await Issue.findById(id)
    .populate('order delivery trip vehicle reportedBy', '-password');

  if (!issue) {
    return res.status(404).json(new ApiResponse(404, null, 'Issue not found'));
  }

  res.status(200).json(new ApiResponse(200, issue, 'Issue retrieved'));
});

const updateIssueStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, notes } = req.body;

  const issue = await Issue.findById(id);
  if (!issue) {
    return res.status(404).json(new ApiResponse(404, null, 'Issue not found'));
  }

  const prevStatus = issue.status;
  issue.status = status || issue.status;
  if (status === 'RESOLVED') {
    issue.resolvedAt = new Date();
  }
  await issue.save();

  await auditService.log({
    user: req.user,
    action: 'OTHER',
    entityType: 'Issue',
    entityId: issue._id,
    previousData: { status: prevStatus },
    newData: { status: issue.status, notes },
    reason: notes
  });

  res.status(200).json(new ApiResponse(200, issue, 'Issue updated'));
});

module.exports = {
  getIssues,
  getIssueById,
  updateIssueStatus
};
