const mongoose = require('mongoose');

const offlineEventSchema = new mongoose.Schema({
  clientEventId: { type: String, required: true, unique: true },
  deviceId: { type: String, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  eventType: { type: String, required: true },
  entityType: { type: String },
  entityId: { type: String, required: true },
  payload: { type: mongoose.Schema.Types.Mixed },
  clientTimestamp: { type: Date, required: true },
  serverTimestamp: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ["PENDING", "PROCESSING", "SYNCED", "PROCESSED", "CONFLICT", "FAILED"],
    default: "PENDING"
  },
  conflictReason: { type: String }
}, { timestamps: true });

offlineEventSchema.index({ status: 1 });
offlineEventSchema.index({ user: 1, clientTimestamp: -1 });

module.exports = mongoose.model('OfflineEvent', offlineEventSchema);
