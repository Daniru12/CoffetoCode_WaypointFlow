const mongoose = require('mongoose');

const issueSchema = new mongoose.Schema({
  issueRef: { type: String, required: true, unique: true },
  type: {
    type: String,
    enum: [
      'MISSING_GOODS',
      'DAMAGED_GOODS',
      'WRONG_QUANTITY',
      'OUTLET_CLOSED',
      'ACCESS_BLOCKED',
      'DELIVERY_REJECTED',
      'VEHICLE_BREAKDOWN',
      'REEFER_FAILURE',
      'ACCIDENT',
      'OTHER'
    ],
    required: true
  },
  source: {
    type: String,
    enum: ['STORE_MANAGER', 'LOADER', 'DRIVER', 'DISPATCHER', 'SYSTEM'],
    default: 'DRIVER'
  },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  delivery: { type: mongoose.Schema.Types.ObjectId, ref: 'Delivery' },
  trip: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip' },
  vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
  reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  description: { type: String, required: true },
  quantity: { type: Number },
  evidenceUrls: [{ type: String }],
  severity: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'MEDIUM'
  },
  status: {
    type: String,
    enum: ['OPEN', 'INVESTIGATING', 'RESOLVED', 'DISMISSED'],
    default: 'OPEN'
  },
  resolvedAt: { type: Date }
}, { timestamps: true });

issueSchema.index({ type: 1, status: 1 });
issueSchema.index({ trip: 1 });
issueSchema.index({ vehicle: 1 });
issueSchema.index({ order: 1 });

module.exports = mongoose.model('Issue', issueSchema);
