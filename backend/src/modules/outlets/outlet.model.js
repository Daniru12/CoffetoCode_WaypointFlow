const mongoose = require('mongoose');

const outletSchema = new mongoose.Schema({
  outletId: { type: String, required: true, unique: true },
  brand: {
    type: String,
    enum: ["Fresh", "Style", "Tech"],
    required: true
  },
  district: { type: String, required: true },
  depot: { type: String, required: true },
  dockType: { type: String },
  parkingConstraint: {
    type: String,
    enum: ["normal", "van_only", "mall_dock"],
    default: "normal"
  },
  mallWindow: { type: String },
  windowOpenTime: { type: String },
  windowCloseTime: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Outlet', outletSchema);
