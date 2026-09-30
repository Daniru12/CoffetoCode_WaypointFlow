module.exports = {
  validate(order, vehicle, trip, context = {}) {
    const weeklyQuota = vehicle.weeklyFuelQuotaL || 200;
    const currentFuelUsed = vehicle.fuelUsedThisWeek || 0;
    const kmPerL = vehicle.kmPerL || 4;

    const estimatedTripKm = (trip && trip.estimatedDistanceKm) ? trip.estimatedDistanceKm : (context.estimatedTripKm || 25);
    const estimatedTripFuel = estimatedTripKm / kmPerL;

    if (currentFuelUsed + estimatedTripFuel > weeklyQuota) {
      return {
        valid: false,
        code: 'FUEL_LIMIT_EXCEEDED',
        message: `Trip would require ~${estimatedTripFuel.toFixed(1)}L fuel, exceeding vehicle ${vehicle.vehicleId}'s weekly quota (${(currentFuelUsed + estimatedTripFuel).toFixed(1)}L / ${weeklyQuota}L).`
      };
    }

    return { valid: true };
  }
};
