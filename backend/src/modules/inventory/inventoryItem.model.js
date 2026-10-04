const mongoose = require('mongoose');

const inventoryItemSchema = new mongoose.Schema(
  {
    itemCode: { type: String, required: true, unique: true },
    itemName: { type: String, required: true },
    quantity: { type: Number, default: 0, min: 0 },
    category: { type: String },
    unit: { type: String },
    extraData: { type: mongoose.Schema.Types.Mixed }, // to store any additional columns
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('InventoryItem', inventoryItemSchema);
