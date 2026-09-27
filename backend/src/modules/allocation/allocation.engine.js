const constraintValidator = require('./constraint.validator');
const Vehicle = require('../vehicles/vehicle.model');

class AllocationEngine {
  
  /**
   * Evaluates compatibility for assigning an order to available vehicles
   */
  async getCompatibleVehicles(order) {
    // 1. Fetch available vehicles
    // This could be restricted to vehicles at the order's depot
    const availableVehicles = await Vehicle.find({ status: 'AVAILABLE' });
    
    const compatibilityList = [];

    // 2. Run validations against each vehicle
    for (const vehicle of availableVehicles) {
      // Assuming a new trip for simplicity right now
      const validationResult = constraintValidator.validateAssignment({ order, vehicle, trip: null });
      
      compatibilityList.push({
        vehicle,
        compatible: validationResult.valid,
        violations: validationResult.violations
      });
    }

    return compatibilityList;
  }
}

module.exports = new AllocationEngine();
