const mongoose = require('mongoose');

const deliveryPlanSchema = new mongoose.Schema({
  deliveryDate: { type: Date, required: true },
  depot: { type: String, required: true },
  status: {
    type: String,
    enum: ["DRAFT", "VALIDATING", "READY", "PUBLISHED"],
    default: "DRAFT"
  },
  servedOrders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }],
  deferredOrders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  publishedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('DeliveryPlan', deliveryPlanSchema);
