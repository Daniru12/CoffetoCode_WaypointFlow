const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema({
  tripRef: { type: String, unique: true, sparse: true },
  plan: { type: mongoose.Schema.Types.ObjectId, ref: 'DeliveryPlan', required: true },
  vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
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
      stopSequence: { type: Number },
      estimatedArrival: { type: Date }
    }
  ],
  lifoLoadingList: [
    {
      loadingOrder: { type: Number },
      stopSequence: { type: Number },
      orderRef: { type: String },
      outletName: { type: String },
      units: { type: Number },
      weightKg: { type: Number },
      volumeM3: { type: Number },
      temp: { type: String }
    }
  ],
  totalWeightKg: { type: Number, default: 0 },
  totalVolumeM3: { type: Number, default: 0 },
  estimatedMinutes: { type: Number, default: 0 },
  estimatedDistanceKm: { type: Number, default: 0 },
  plannedDeparture: { type: Date },
  isAutoAssigned: { type: Boolean, default: false },
  autoAssignReason: { type: String, default: null },
  atRisk: { type: Boolean, default: false },
  reassignmentTemplate: { type: Object, default: null },
  validationStatus: { type: Object, default: null },
  status: {
    type: String,
    enum: [
      "PLANNED", "READY_FOR_LOADING", "LOADING", "READY", 
      "IN_PROGRESS", "IN_TRANSIT", "COMPLETED", "INTERRUPTED"
    ],
    default: "PLANNED"
  },
  startedAt: { type: Date },
  completedAt: { type: Date }
}, { timestamps: true });

tripSchema.index({ vehicle: 1, plan: 1 });
tripSchema.index({ driver: 1 });
tripSchema.index({ status: 1 });

module.exports = mongoose.model('Trip', tripSchema);
