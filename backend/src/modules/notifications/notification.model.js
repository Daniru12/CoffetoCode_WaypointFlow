const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: { type: String, default: 'INFO' },
  title: { type: String, required: true },
  message: { type: String, required: true },
  entityType: { type: String },
  entityId: { type: String },
  isRead: { type: Boolean, default: false }
}, { timestamps: true });

notificationSchema.index({ user: 1, isRead: 1 });
notificationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
