const mongoose = require('mongoose');

const exceptionSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  type: { 
    type: String, 
    enum: ['SKIP', 'CHANGE_QTY', 'ADD_ITEM', 'REMOVE_ITEM', 'CHANGE_DATE', 'PAUSE'],
    required: true 
  },
  details: { type: mongoose.Schema.Types.Mixed } // Flexible object for exception details
});

const replenishmentPlanSchema = new mongoose.Schema({
  planName: { type: String, required: true },
  description: { type: String },
  status: {
    type: String,
    enum: ['DRAFT', 'ACTIVE', 'PAUSED'],
    default: 'DRAFT'
  },
  storeManager: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  outlets: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Outlet', required: true }],
  
  frequency: {
    type: String,
    enum: ['WEEKLY', 'MONTHLY', 'CUSTOM'],
    required: true
  },
  
  // Weekly specific
  deliveryDays: [{ type: String, enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] }],
  
  // Monthly specific
  monthlyScheduleType: { type: String, enum: ['SPECIFIC_DATE', 'SPECIFIC_WEEKDAY'] },
  monthlyScheduleDetails: { type: mongoose.Schema.Types.Mixed }, 
  
  // Custom specific
  customDates: [{ type: Date }],

  startDate: { type: Date, required: true },
  endDate: { type: Date }, // null if no end date
  
  brand: { type: String, required: true }, // Not explicitly requested but necessary for Outlet relation
  cargoType: {
    type: String,
    enum: ['ambient', 'chilled'],
    required: true
  },
  
  items: [
    {
      itemName: { type: String, required: true },
      qty: { type: Number, required: true, min: 1 },
      unit: { type: String, default: "cases" }
    }
  ],
  
  estimatedTotalUnits: { type: Number, default: 0 },
  estimatedTotalWeightKg: { type: Number, required: true, min: 0 },
  estimatedTotalVolumeM3: { type: Number, required: true, min: 0 },
  
  specialInstructions: { type: String },
  
  exceptions: [exceptionSchema]

}, { timestamps: true });

module.exports = mongoose.model('ReplenishmentPlan', replenishmentPlanSchema);
