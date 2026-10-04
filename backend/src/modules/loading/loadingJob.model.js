const mongoose = require('mongoose');

const loadingJobSchema = new mongoose.Schema({
  loadingJobRef: { type: String, required: true, unique: true },
  trip: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true },
  vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
  loader: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: {
    type: String,
    enum: [
      'PENDING',
      'LOADING',
      'SHORTFALL',
      'WAITING_FOR_DECISION',
      'COMPLETED',
      'READY_FOR_DEPARTURE'
    ],
    default: 'PENDING'
  },
  items: [
    {
      order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
      expectedQty: { type: Number, required: true },
      loadedQty: { type: Number, default: 0 },
      status: {
        type: String,
        enum: ['PENDING', 'LOADED', 'SHORTFALL', 'DAMAGED'],
        default: 'PENDING'
      },
      notes: { type: String }
    }
  ],
  startedAt: { type: Date },
  completedAt: { type: Date },
  isStockTransfer: { type: Boolean, default: false },
  stockTransferNote: { type: String }
}, { timestamps: true });

loadingJobSchema.index({ trip: 1 });
loadingJobSchema.index({ vehicle: 1 });
loadingJobSchema.index({ status: 1 });

module.exports = mongoose.model('LoadingJob', loadingJobSchema);
