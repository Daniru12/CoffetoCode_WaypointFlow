const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema({
  deliveryRef: { type: String, unique: true, sparse: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  trip: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true },
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  outlet: { type: mongoose.Schema.Types.ObjectId, ref: 'Outlet', required: true },
  stopSequence: { type: Number, required: true },
  status: {
    type: String,
    enum: ['PENDING', 'ARRIVED', 'DELIVERED', 'FAILED'],
    default: 'PENDING'
  },
  plannedArrival: { type: Date },
  actualArrival: { type: Date },
  deliveredQuantity: { type: Number },
  startedAt: { type: Date },
  completedAt: { type: Date },
  syncStatus: {
    type: String,
    enum: ['SYNCED', 'PENDING', 'CONFLICT'],
    default: 'SYNCED'
  }
}, { timestamps: true });

deliverySchema.index({ trip: 1, stopSequence: 1 });
deliverySchema.index({ driver: 1 });
deliverySchema.index({ order: 1 });

module.exports = mongoose.model('Delivery', deliverySchema);
