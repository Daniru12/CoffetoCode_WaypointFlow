const mongoose = require('mongoose');

const stockRequestSchema = new mongoose.Schema(
  {
    storeManager: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [
      {
        itemCode: { type: String, required: true },
        itemName: { type: String, required: true },
        requiredQuantity: { type: Number, required: true },
        availableQuantity: { type: Number, required: true },
        shortageQuantity: { type: Number, required: true },
      }
    ],
    status: {
      type: String,
      enum: ['REQUESTED', 'APPROVED', 'REJECTED', 'SENT', 'RECEIVED'],
      default: 'REQUESTED'
    },
    requestedAt: { type: Date, default: Date.now },
    resolvedAt: { type: Date }
  },
  { timestamps: true }
);

module.exports = mongoose.model('StockRequest', stockRequestSchema);
