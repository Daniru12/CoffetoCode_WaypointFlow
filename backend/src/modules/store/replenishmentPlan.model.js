const mongoose = require('mongoose');

const replenishmentPlanSchema = new mongoose.Schema({
  planName: { type: String, required: true },
  storeManager: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  outlets: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Outlet' }],
  frequency: {
    type: String,
    enum: ['WEEKLY', 'MONTHLY'],
    required: true
  },
  scheduleDay: { type: Number, required: true }, // 1-7 for Weekly (1=Monday), 1-28 for Monthly
  brand: { type: String, required: true },
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
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('ReplenishmentPlan', replenishmentPlanSchema);
