module.exports = {
  validate(order, vehicle, trip, context = {}) {
    // If vehicle has already performed/scheduled 2 trips for this plan date
    const vehicleTripsCount = context.vehicleTripsCount || (trip && trip.tripNumber ? 1 : 0);

    // If attempting to schedule a 3rd trip
    if (trip && trip.tripNumber && trip.tripNumber > 2) {
      return {
        valid: false,
        code: 'MAX_TRIP_LIMIT_EXCEEDED',
        message: `Vehicle ${vehicle.vehicleId} exceeds the maximum allowance of 2 trips per daily shift.`
      };
    }

    if (vehicleTripsCount >= 2 && (!trip || !trip._id)) {
      return {
        valid: false,
        code: 'MAX_TRIP_LIMIT_EXCEEDED',
        message: `Vehicle ${vehicle.vehicleId} has already been allocated to 2 trips for this delivery schedule.`
      };
    }

    return { valid: true };
  }
};
