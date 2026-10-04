const mongoose = require('mongoose');

const storeManagerInventorySchema = new mongoose.Schema(
  {
    storeManager: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    itemCode: { type: String, required: true },
    itemName: { type: String, required: true },
    quantity: { type: Number, default: 0, min: 0 },
    category: { type: String },
    unit: { type: String },
    extraData: { type: mongoose.Schema.Types.Mixed }, // to store any additional columns like temp requirement
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Compound index to ensure one record per item per store manager
storeManagerInventorySchema.index({ storeManager: 1, itemCode: 1 }, { unique: true });

module.exports = mongoose.model('StoreManagerInventory', storeManagerInventorySchema);
