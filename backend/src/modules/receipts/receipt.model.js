const mongoose = require('mongoose');

const receiptSchema = new mongoose.Schema({
  delivery: { type: mongoose.Schema.Types.ObjectId, ref: 'Delivery', required: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  outlet: { type: mongoose.Schema.Types.ObjectId, ref: 'Outlet', required: true },
  confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  expectedQuantity: { type: Number, required: true },
  receivedQuantity: { type: Number, required: true },
  condition: {
    type: String,
    enum: ['GOOD', 'DAMAGED', 'PARTIAL'],
    default: 'GOOD'
  },
  discrepancy: { type: Number, default: 0 },
  notes: { type: String },
  evidenceUrls: [{ type: String }],
  confirmedAt: { type: Date, default: Date.now }
}, { timestamps: true });

receiptSchema.index({ order: 1 });
receiptSchema.index({ delivery: 1 });
receiptSchema.index({ outlet: 1 });

module.exports = mongoose.model('Receipt', receiptSchema);
