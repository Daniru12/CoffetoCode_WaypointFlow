const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action: {
    type: String,
    required: true,
    enum: [
      'VEHICLE_ASSIGNED',
      'ASSIGNMENT_REJECTED',
      'ORDER_DEFERRED',
      'PLAN_PUBLISHED',
      'LOADING_SHORTFALL',
      'DELIVERY_FAILED',
      'ROUTE_REASSIGNED',
      'OFFLINE_SYNC_CONFLICT',
      'ORDER_CREATED',
      'ORDER_UPDATED',
      'ORDER_DELETED',
      'VEHICLE_STATUS_CHANGED',
      'RECEIPT_CONFIRMED',
      'ISSUE_REPORTED',
      'OTHER'
    ]
  },
  entityType: { type: String, required: true },
  entityId: { type: String, required: true },
  previousData: { type: mongoose.Schema.Types.Mixed },
  newData: { type: mongoose.Schema.Types.Mixed },
  reason: { type: String }
}, { timestamps: true });

auditLogSchema.index({ entityType: 1, entityId: 1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
