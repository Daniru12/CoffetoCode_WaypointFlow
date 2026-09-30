const mongoose = require('mongoose');

const deliveryPlanSchema = new mongoose.Schema({
  planRef: { type: String, unique: true, sparse: true },
  deliveryDate: { type: Date, required: true },
  depot: { type: String, required: true },
  status: {
    type: String,
    enum: ["DRAFT", "VALIDATING", "READY", "PUBLISHED", "COMPLETED"],
    default: "DRAFT"
  },
  totalOrders: { type: Number, default: 0 },
  servedOrders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }],
  deferredOrders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  validationSummary: { type: mongoose.Schema.Types.Mixed },
  publishedAt: { type: Date }
}, { timestamps: true });

deliveryPlanSchema.index({ deliveryDate: 1, depot: 1 });

module.exports = mongoose.model('DeliveryPlan', deliveryPlanSchema);
