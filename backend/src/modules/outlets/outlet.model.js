const mongoose = require('mongoose');

const outletSchema = new mongoose.Schema({
  outletId: { type: String, required: true, unique: true },
  name: { type: String },
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
  windowOpenTime: { type: String, default: "06:00" },
  windowCloseTime: { type: String, default: "08:00" },
  latitude: { type: Number },
  longitude: { type: Number }
}, { timestamps: true });

outletSchema.index({ depot: 1, brand: 1, district: 1 });

module.exports = mongoose.model('Outlet', outletSchema);
