const mongoose = require('mongoose');

const driverLocationSchema = new mongoose.Schema({
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  trip: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip' },
  vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  speed: { type: Number },
  heading: { type: Number },
  recordedAt: { type: Date, default: Date.now }
}, { timestamps: true });

driverLocationSchema.index({ driver: 1, recordedAt: -1 });
driverLocationSchema.index({ trip: 1, recordedAt: -1 });

module.exports = mongoose.model('DriverLocation', driverLocationSchema);
