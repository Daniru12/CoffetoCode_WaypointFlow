const mongoose = require('mongoose');

const deferralSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  plan: { type: mongoose.Schema.Types.ObjectId, ref: 'DeliveryPlan' },
  reasonCode: {
    type: String,
    enum: [
      'NO_VEHICLE_CAPACITY',
      'NO_REEFER_CAPACITY',
      'NO_COMPATIBLE_VEHICLE',
      'DELIVERY_WINDOW_CONFLICT',
      'FUEL_LIMIT',
      'VEHICLE_BREAKDOWN',
      'LOADING_SHORTFALL',
      'OTHER'
    ],
    required: true
  },
  reason: { type: String, required: true },
  deferredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  deferredAt: { type: Date, default: Date.now },
  nextSuggestedRun: { type: Date },
  previousDeferralCount: { type: Number, default: 0 },
  resolvedAt: { type: Date }
}, { timestamps: true });

deferralSchema.index({ order: 1 });
deferralSchema.index({ plan: 1 });
deferralSchema.index({ deferredAt: -1 });

module.exports = mongoose.model('Deferral', deferralSchema);
