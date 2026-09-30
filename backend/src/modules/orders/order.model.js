const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderRef: { type: String, required: true, unique: true },
  outlet: { type: mongoose.Schema.Types.ObjectId, ref: 'Outlet', required: true },
  brand: { type: String, required: true },
  requestedDeliveryDate: { type: Date, required: true },
  tempRequirement: {
    type: String,
    enum: ["ambient", "chilled"],
    required: true
  },
  items: [
    {
      itemName: { type: String },
      qty: { type: Number, default: 1 },
      unit: { type: String, default: "cases" },
      weightKg: { type: Number, default: 0 },
      volumeM3: { type: Number, default: 0 }
    }
  ],
  orderUnits: { type: Number, required: true, default: 1 },
  orderWeightKg: { type: Number, required: true, default: 0 },
  orderVolumeM3: { type: Number, required: true, default: 0 },
  deliveryWindow: {
    start: { type: String },
    end: { type: String }
  },
  status: {
    type: String,
    enum: [
      "DRAFT", "CONFIRMED", "PLANNING", "SCHEDULED", "PLANNED",
      "DEFERRED", "LOADING", "OUT_FOR_DELIVERY", "DELIVERED",
      "ISSUE_REPORTED", "CLOSED"
    ],
    default: "DRAFT"
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  submittedAt: { type: Date, default: Date.now },
  scheduledAt: { type: Date },
  estimatedArrival: { type: Date },
  deferredCount: { type: Number, default: 0 },
  lastDeferredAt: { type: Date }
}, { timestamps: true });

orderSchema.index({ requestedDeliveryDate: 1, status: 1 });
orderSchema.index({ outlet: 1 });
orderSchema.index({ brand: 1 });

module.exports = mongoose.model('Order', orderSchema);
