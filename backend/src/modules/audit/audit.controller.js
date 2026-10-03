const AuditLog = require('./auditLog.model');
const ApiResponse = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');

const getAuditLogs = asyncHandler(async (req, res) => {
  const { action, entityType, entityId } = req.query;
  const filter = {};
  if (action) filter.action = action;
  if (entityType) filter.entityType = entityType;
  if (entityId) filter.entityId = entityId;

  const logs = await AuditLog.find(filter)
    .populate('user', 'name email role')
    .sort({ createdAt: -1 })
    .limit(100);

  res.status(200).json(new ApiResponse(200, logs, `Retrieved ${logs.length} audit logs`));
});

module.exports = {
  getAuditLogs
};
