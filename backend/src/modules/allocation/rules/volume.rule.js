module.exports = {
  validate(order, vehicle, trip) {
    if (!vehicle) return { valid: true };

    const currentVolume = trip ? (trip.totalVolumeM3 || 0) : 0;
    const orderVolume = Number(order.orderVolumeM3) || 0;

    // Check if order is already present in this trip's orders array
    const isAlreadyInTrip = Boolean(
      trip && Array.isArray(trip.orders) &&
      trip.orders.some(item => {
        const itemOrderId = item?.order?._id || item?.order;
        const targetOrderId = order?._id || order;
        return itemOrderId && targetOrderId && itemOrderId.toString() === targetOrderId.toString();
      })
    );

    const effectiveTotalVolume = isAlreadyInTrip ? currentVolume : (currentVolume + orderVolume);

    if (effectiveTotalVolume > vehicle.volumeCapM3) {
      return {
        valid: false,
        code: 'VOLUME_LIMIT_EXCEEDED',
        message: `Order payload volume (${effectiveTotalVolume.toFixed(2)}m³) exceeds vehicle volume capacity (${vehicle.volumeCapM3}m³).`
      };
    }

    return { valid: true };
  }
};
