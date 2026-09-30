module.exports = {
  validate(order, vehicle, trip) {
    if (!trip) return { valid: true };

    // Brand partition check on same trip
    if (trip.brand && order.brand && trip.brand !== order.brand) {
      return {
        valid: false,
        code: 'BRAND_MISMATCH',
        message: `Trip is dedicated to brand '${trip.brand}', order belongs to '${order.brand}'.`
      };
    }

    // District compatibility check (if trip is bound to a single district cluster)
    const outletDistrict = (order.outlet && order.outlet.district) || order.district;
    if (trip.district && outletDistrict && trip.district !== outletDistrict) {
      return {
        valid: false,
        code: 'DISTRICT_MISMATCH',
        message: `Trip is serving district '${trip.district}', order is in '${outletDistrict}'.`
      };
    }

    return { valid: true };
  }
};
