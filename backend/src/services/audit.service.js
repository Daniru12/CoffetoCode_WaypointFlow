const AuditLog = require('../modules/audit/auditLog.model');

class AuditService {
  async log({ user, action, entityType, entityId, previousData, newData, reason }) {
    try {
      return await AuditLog.create({
        user: user ? (user._id || user) : null,
        action,
        entityType,
        entityId: entityId ? entityId.toString() : 'UNKNOWN',
        previousData,
        newData,
        reason
      });
    } catch (err) {
      console.warn('AuditService log error:', err.message);
      return null;
    }
  }
}

module.exports = new AuditService();
