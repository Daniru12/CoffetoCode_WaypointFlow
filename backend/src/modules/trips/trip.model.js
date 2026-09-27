const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema({
  plan: { type: mongoose.Schema.Types.ObjectId, ref: 'DeliveryPlan', required: true },
  vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
  tripNumber: {
    type: Number,
    enum: [1, 2],
    required: true
  },
  brand: { type: String },
  district: { type: String },
  orders: [
    {
      order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
      stopSequence: { type: Number }
    }
  ],
  totalWeightKg: { type: Number, default: 0 },
  totalVolumeM3: { type: Number, default: 0 },
  estimatedMinutes: { type: Number, default: 0 },
  status: {
    type: String,
    enum: [
      "PLANNED", "READY_FOR_LOADING", "LOADING", "READY", 
      "IN_PROGRESS", "COMPLETED", "INTERRUPTED"
    ],
    default: "PLANNED"
  }
}, { timestamps: true });

tripSchema.index({ vehicle: 1, plan: 1 });

module.exports = mongoose.model('Trip', tripSchema);
