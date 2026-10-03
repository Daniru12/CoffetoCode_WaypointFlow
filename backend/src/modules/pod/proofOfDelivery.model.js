const mongoose = require('mongoose');

const proofOfDeliverySchema = new mongoose.Schema({
  delivery: { type: mongoose.Schema.Types.ObjectId, ref: 'Delivery', required: true, unique: true },
  receiverName: { type: String, required: true },
  receivedQuantity: { type: Number, required: true },
  signatureUrl: { type: String },
  photoUrls: [{ type: String }],
  timestamp: { type: Date, default: Date.now },
  latitude: { type: Number },
  longitude: { type: Number }
}, { timestamps: true });

module.exports = mongoose.model('ProofOfDelivery', proofOfDeliverySchema);
