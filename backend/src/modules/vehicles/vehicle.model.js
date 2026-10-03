const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  vehicleId: { type: String, required: true, unique: true },
  type: {
    type: String,
    enum: ["truck", "van"],
    required: true
  },
  temp: {
    type: String,
    enum: ["reefer", "ambient"],
    required: true
  },
  weightCapKg: { type: Number, required: true },
  volumeCapM3: { type: Number, required: true },
  fuelType: { type: String, default: "diesel" },
  kmPerL: { type: Number, default: 4 },
  weeklyFuelQuotaL: { type: Number, default: 200 },
  fuelUsedThisWeek: { type: Number, default: 0 },
  depot: { type: String, required: true },
  status: {
    type: String,
    enum: ["AVAILABLE", "ASSIGNED", "LOADING", "READY", "IN_TRANSIT", "IN_WORKSHOP", "UNAVAILABLE"],
    default: "AVAILABLE"
  },
  assignedDriver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

vehicleSchema.index({ depot: 1, status: 1, temp: 1 });

module.exports = mongoose.model('Vehicle', vehicleSchema);
