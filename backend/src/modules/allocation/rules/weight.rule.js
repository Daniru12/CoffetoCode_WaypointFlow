module.exports = {
  validate(order, vehicle, trip) {
    if (!vehicle) return { valid: true };

    const currentWeight = trip ? (trip.totalWeightKg || 0) : 0;
    const orderWeight = Number(order.orderWeightKg) || 0;

    // Check if order is already present in this trip's orders array
    const isAlreadyInTrip = Boolean(
      trip && Array.isArray(trip.orders) &&
      trip.orders.some(item => {
        const itemOrderId = item?.order?._id || item?.order;
        const targetOrderId = order?._id || order;
        return itemOrderId && targetOrderId && itemOrderId.toString() === targetOrderId.toString();
      })
    );

    const effectiveTotalWeight = isAlreadyInTrip ? currentWeight : (currentWeight + orderWeight);

    if (effectiveTotalWeight > vehicle.weightCapKg) {
      return {
        valid: false,
        code: 'WEIGHT_LIMIT_EXCEEDED',
        message: `Order payload (${effectiveTotalWeight}kg) exceeds vehicle weight capacity (${vehicle.weightCapKg}kg).`
      };
    }

    return { valid: true };
  }
};
