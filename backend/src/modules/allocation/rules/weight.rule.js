module.exports = {
  validate(order, vehicle, trip) {
    const currentWeight = trip ? (trip.totalWeightKg || 0) : 0;
    const orderWeight = Number(order.orderWeightKg) || 0;

    if (currentWeight + orderWeight > vehicle.weightCapKg) {
      return {
        valid: false,
        code: 'WEIGHT_LIMIT_EXCEEDED',
        message: `Adding order (${orderWeight}kg) exceeds vehicle weight capacity (${currentWeight + orderWeight}kg / ${vehicle.weightCapKg}kg).`
      };
    }

    return { valid: true };
  }
};
