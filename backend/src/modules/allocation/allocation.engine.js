const constraintValidator = require('./constraint.validator');
const Vehicle = require('../vehicles/vehicle.model');
const Trip = require('../trips/trip.model');

class AllocationEngine {
  /**
   * Evaluates compatibility for assigning an order to available vehicles
   * @param {Object} order 
   * @param {Object} [trip] optional existing trip to test addition to
   */
  async getCompatibleVehicles(order, trip = null) {
    const outletDepot = (order.outlet && order.outlet.depot) || order.depot;

    // Fetch vehicles (optionally at same depot if specified, or all active)
    const filter = { status: { $in: ['AVAILABLE', 'ASSIGNED'] } };
    if (outletDepot) {
      filter.depot = outletDepot;
    }

    const candidateVehicles = await Vehicle.find(filter);

    const compatibilityList = [];
    const recommendedVehicles = [];

    for (const vehicle of candidateVehicles) {
      // Check existing trip count for this vehicle today
      const vehicleTripsCount = await Trip.countDocuments({
        vehicle: vehicle._id,
        status: { $nin: ['COMPLETED', 'INTERRUPTED'] }
      });

      const validationResult = constraintValidator.validateAssignment({
        order,
        vehicle,
        trip,
        context: { vehicleTripsCount }
      });

      const item = {
        vehicle,
        compatible: validationResult.valid,
        violations: validationResult.violations
      };

      compatibilityList.push(item);

      if (validationResult.valid) {
        recommendedVehicles.push(vehicle);
      }
    }

    return {
      orderId: order._id,
      orderRef: order.orderRef,
      evaluatedVehiclesCount: candidateVehicles.length,
      recommendedVehicles,
      evaluations: compatibilityList
    };
  }

  /**
   * Validate a specific proposed assignment
   */
  async validateProposedAssignment(order, vehicle, trip = null) {
    let vehicleTripsCount = 0;
    if (vehicle && vehicle._id) {
      vehicleTripsCount = await Trip.countDocuments({
        vehicle: vehicle._id,
        status: { $nin: ['COMPLETED', 'INTERRUPTED'] }
      });
    }

    return constraintValidator.validateAssignment({
      order,
      vehicle,
      trip,
      context: { vehicleTripsCount }
    });
  }
}

module.exports = new AllocationEngine();
