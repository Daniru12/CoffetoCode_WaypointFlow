const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ["ADMIN", "STORE_MANAGER", "DISPATCHER", "LOADER", "DRIVER"],
    required: true
  },
  outlet: { type: mongoose.Schema.Types.ObjectId, ref: 'Outlet' },
  outletId: { type: String },
  depot: { type: String },
  assignedVehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
