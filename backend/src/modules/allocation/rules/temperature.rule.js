module.exports = {
  validate(order, vehicle, trip) {
    if (order.tempRequirement === 'chilled' && vehicle.temp !== 'reefer') {
      return {
        valid: false,
        code: 'REFRIGERATION_REQUIRED',
        message: 'Ambient vehicle cannot carry chilled goods. Chilled orders require a reefer vehicle.'
      };
    }
    return { valid: true };
  }
};
