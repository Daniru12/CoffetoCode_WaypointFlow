const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ["STORE_MANAGER", "DISPATCHER", "LOADER", "DRIVER"],
    required: true
  },
  outlet: { type: mongoose.Schema.Types.ObjectId, ref: 'Outlet' },
  depot: { type: String },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
