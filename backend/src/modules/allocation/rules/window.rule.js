const { isWithinTimeWindow } = require('../../../utils/time.util');

module.exports = {
  validate(order, vehicle, trip, context = {}) {
    const outlet = order.outlet || {};
    const openTime = outlet.windowOpenTime || (order.deliveryWindow && order.deliveryWindow.start);
    const closeTime = outlet.windowCloseTime || (order.deliveryWindow && order.deliveryWindow.end);

    // If an estimated arrival time or trip planned departure is provided
    const targetTime = context.targetArrivalTime || (trip && trip.plannedDeparture ? new Date(trip.plannedDeparture).toTimeString().slice(0, 5) : null);

    if (openTime && closeTime && targetTime) {
      if (!isWithinTimeWindow(targetTime, openTime, closeTime)) {
        return {
          valid: false,
          code: 'DELIVERY_WINDOW_CONFLICT',
          message: `Estimated arrival (${targetTime}) is outside outlet delivery window (${openTime} - ${closeTime}).`
        };
      }
    }

    return { valid: true };
  }
};
