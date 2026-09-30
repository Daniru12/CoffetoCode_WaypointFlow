module.exports = {
  validate(order, vehicle, trip) {
    const outletDepot = (order.outlet && order.outlet.depot) ? order.outlet.depot : order.depot;

    if (outletDepot && vehicle.depot && outletDepot !== vehicle.depot) {
      return {
        valid: false,
        code: 'DEPOT_MISMATCH',
        message: `Depot mismatch: Order belongs to depot '${outletDepot}', but vehicle belongs to '${vehicle.depot}'.`
      };
    }

    return { valid: true };
  }
};
