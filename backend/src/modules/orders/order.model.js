const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderRef: { type: String, required: true, unique: true },
  outlet: { type: mongoose.Schema.Types.ObjectId, ref: 'Outlet', required: true },
  requestedDeliveryDate: { type: Date, required: true },
  brand: { type: String, required: true },
  tempRequirement: {
    type: String,
    enum: ["ambient", "chilled"],
    required: true
  },
  orderUnits: { type: Number, required: true },
  orderWeightKg: { type: Number, required: true },
  orderVolumeM3: { type: Number, required: true },
  status: {
    type: String,
    enum: [
      "DRAFT", "CONFIRMED", "PLANNING", "PLANNED", "DEFERRED", 
      "LOADING", "OUT_FOR_DELIVERY", "DELIVERED", "ISSUE_REPORTED", "CLOSED"
    ],
    default: "DRAFT"
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

orderSchema.index({ requestedDeliveryDate: 1, status: 1 });
orderSchema.index({ outlet: 1 });

module.exports = mongoose.model('Order', orderSchema);
