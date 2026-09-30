const mongoose = require('mongoose');

const capacityForecastSchema = new mongoose.Schema({
  week: { type: String, required: true },
  depot: { type: String, required: true },
  brand: { type: String, required: true },
  predictedTotalVolume: { type: Number, default: 0 },
  predictedChilledVolume: { type: Number, default: 0 },
  estimatedVehicles: { type: Number, default: 0 },
  estimatedDrivers: { type: Number, default: 0 },
  estimatedReeferCapacity: { type: Number, default: 0 },
  generatedAt: { type: Date, default: Date.now },
  source: { type: String, default: 'HISTORICAL_DEMAND_MODEL' }
}, { timestamps: true });

capacityForecastSchema.index({ week: 1, depot: 1, brand: 1 });

module.exports = mongoose.model('CapacityForecast', capacityForecastSchema);
