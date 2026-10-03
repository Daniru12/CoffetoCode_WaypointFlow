module.exports = {
  validate(order, vehicle, trip) {
    if (!vehicle) {
      return {
        valid: false,
        code: 'VEHICLE_NOT_FOUND',
        message: 'No vehicle specified for assignment.'
      };
    }

    if (vehicle.status === 'IN_WORKSHOP' || vehicle.status === 'UNAVAILABLE') {
      return {
        valid: false,
        code: 'VEHICLE_UNAVAILABLE',
        message: `Vehicle ${vehicle.vehicleId} is currently ${vehicle.status} and cannot be assigned.`
      };
    }

    return { valid: true };
  }
};
