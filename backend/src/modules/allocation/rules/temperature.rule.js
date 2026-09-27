module.exports = {
  validate(order, vehicle, trip) {
    if (order.tempRequirement === 'chilled' && vehicle.temp !== 'reefer') {
      return {
        valid: false,
        code: 'REFRIGERATION_REQUIRED',
        message: 'This chilled order requires a refrigerated vehicle.'
      };
    }
    return { valid: true };
  }
};
