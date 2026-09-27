const mongoose = require('mongoose');

const offlineEventSchema = new mongoose.Schema({
  clientEventId: { type: String, required: true, unique: true },
  deviceId: { type: String, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  eventType: { type: String, required: true },
  entityId: { type: String, required: true },
  payload: { type: mongoose.Schema.Types.Mixed },
  clientTimestamp: { type: Date, required: true },
  status: {
    type: String,
    enum: ["PENDING", "PROCESSED", "CONFLICT", "FAILED"],
    default: "PENDING"
  },
  processedAt: { type: Date }
}, { timestamps: true });

offlineEventSchema.index({ clientEventId: 1 }, { unique: true });

module.exports = mongoose.model('OfflineEvent', offlineEventSchema);
