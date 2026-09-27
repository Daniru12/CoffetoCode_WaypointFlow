module.exports = {
  validate(order, vehicle, trip) {
    const currentWeight = trip ? trip.totalWeightKg : 0;
    const currentVolume = trip ? trip.totalVolumeM3 : 0;

    if (currentWeight + order.orderWeightKg > vehicle.weightCapKg) {
      return {
        valid: false,
        code: 'WEIGHT_LIMIT_EXCEEDED',
        message: `Adding order exceeds vehicle weight capacity of ${vehicle.weightCapKg}kg.`
      };
    }

    if (currentVolume + order.orderVolumeM3 > vehicle.volumeCapM3) {
      return {
        valid: false,
        code: 'VOLUME_LIMIT_EXCEEDED',
        message: `Adding order exceeds vehicle volume capacity of ${vehicle.volumeCapM3}m3.`
      };
    }

    return { valid: true };
  }
};
