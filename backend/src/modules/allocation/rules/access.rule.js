module.exports = {
  validate(order, vehicle, trip) {
    const parkingConstraint = (order.outlet && order.outlet.parkingConstraint) || order.parkingConstraint;

    if (parkingConstraint === 'van_only' && vehicle.type !== 'van') {
      return {
        valid: false,
        code: 'VAN_ONLY_ACCESS_REQUIRED',
        message: `Outlet requires 'van_only' access constraint. Assigned vehicle is a '${vehicle.type}'.`
      };
    }

    return { valid: true };
  }
};
