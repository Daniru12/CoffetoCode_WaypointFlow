module.exports = {
  validate(order, vehicle, trip) {
    const currentVolume = trip ? (trip.totalVolumeM3 || 0) : 0;
    const orderVolume = Number(order.orderVolumeM3) || 0;

    if (currentVolume + orderVolume > vehicle.volumeCapM3) {
      return {
        valid: false,
        code: 'VOLUME_LIMIT_EXCEEDED',
        message: `Adding order (${orderVolume}m³) exceeds vehicle volume capacity (${(currentVolume + orderVolume).toFixed(2)}m³ / ${vehicle.volumeCapM3}m³).`
      };
    }

    return { valid: true };
  }
};
