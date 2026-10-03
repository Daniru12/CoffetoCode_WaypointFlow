const constraintValidator = require('../../src/modules/allocation/constraint.validator');

describe('Constraint Validation Engine - 10 Rules', () => {
  const baseOrder = {
    _id: '507f1f77bcf86cd799439011',
    orderRef: 'ORD-TEST-001',
    brand: 'Fresh',
    tempRequirement: 'ambient',
    orderUnits: 10,
    orderWeightKg: 100,
    orderVolumeM3: 1,
    outlet: {
      depot: 'Peliyagoda',
      district: 'Colombo-South',
      parkingConstraint: 'normal',
      windowOpenTime: '06:00',
      windowCloseTime: '08:00'
    }
  };

  const baseVehicle = {
    _id: '507f1f77bcf86cd799439022',
    vehicleId: 'VEH-VAN-01',
    type: 'van',
    temp: 'ambient',
    weightCapKg: 1500,
    volumeCapM3: 8,
    depot: 'Peliyagoda',
    status: 'AVAILABLE',
    weeklyFuelQuotaL: 200,
    fuelUsedThisWeek: 50,
    kmPerL: 5
  };

  const baseTrip = {
    _id: '507f1f77bcf86cd799439033',
    tripNumber: 1,
    brand: 'Fresh',
    district: 'Colombo-South',
    totalWeightKg: 200,
    totalVolumeM3: 2,
    estimatedDistanceKm: 20
  };

  test('Rule 1: Should fail when vehicle is unavailable or in workshop', () => {
    const brokenVehicle = { ...baseVehicle, status: 'IN_WORKSHOP' };
    const res = constraintValidator.validateAssignment({
      order: baseOrder,
      vehicle: brokenVehicle,
      trip: baseTrip
    });

    expect(res.valid).toBe(false);
    expect(res.violations.some(v => v.code === 'VEHICLE_UNAVAILABLE')).toBe(true);
  });

  test('Rule 2: Should fail on depot mismatch', () => {
    const otherDepotVehicle = { ...baseVehicle, depot: 'Kandy' };
    const res = constraintValidator.validateAssignment({
      order: baseOrder,
      vehicle: otherDepotVehicle,
      trip: baseTrip
    });

    expect(res.valid).toBe(false);
    expect(res.violations.some(v => v.code === 'DEPOT_MISMATCH')).toBe(true);
  });

  test('Rule 3: Should fail when chilled order is assigned to ambient vehicle', () => {
    const chilledOrder = { ...baseOrder, tempRequirement: 'chilled' };
    const res = constraintValidator.validateAssignment({
      order: chilledOrder,
      vehicle: baseVehicle, // ambient
      trip: baseTrip
    });

    expect(res.valid).toBe(false);
    expect(res.violations.some(v => v.code === 'REFRIGERATION_REQUIRED')).toBe(true);
  });

  test('Rule 3 (Success): Chilled order on reefer vehicle passes', () => {
    const chilledOrder = { ...baseOrder, tempRequirement: 'chilled' };
    const reeferVehicle = { ...baseVehicle, temp: 'reefer' };
    const res = constraintValidator.validateAssignment({
      order: chilledOrder,
      vehicle: reeferVehicle,
      trip: baseTrip
    });

    expect(res.valid).toBe(true);
  });

  test('Rule 4: Should fail when van_only outlet is assigned to a truck', () => {
    const vanOnlyOrder = {
      ...baseOrder,
      outlet: { ...baseOrder.outlet, parkingConstraint: 'van_only' }
    };
    const truckVehicle = { ...baseVehicle, type: 'truck' };
    const res = constraintValidator.validateAssignment({
      order: vanOnlyOrder,
      vehicle: truckVehicle,
      trip: baseTrip
    });

    expect(res.valid).toBe(false);
    expect(res.violations.some(v => v.code === 'VAN_ONLY_ACCESS_REQUIRED')).toBe(true);
  });

  test('Rule 5: Should fail when trip brand does not match order brand', () => {
    const styleOrder = { ...baseOrder, brand: 'Style' };
    const res = constraintValidator.validateAssignment({
      order: styleOrder,
      vehicle: baseVehicle,
      trip: baseTrip // dedicated to Fresh
    });

    expect(res.valid).toBe(false);
    expect(res.violations.some(v => v.code === 'BRAND_MISMATCH')).toBe(true);
  });

  test('Rule 6: Should fail when weight capacity is exceeded', () => {
    const heavyOrder = { ...baseOrder, orderWeightKg: 1400 };
    // current trip weight 200 + 1400 = 1600 > 1500 cap
    const res = constraintValidator.validateAssignment({
      order: heavyOrder,
      vehicle: baseVehicle,
      trip: baseTrip
    });

    expect(res.valid).toBe(false);
    expect(res.violations.some(v => v.code === 'WEIGHT_LIMIT_EXCEEDED')).toBe(true);
  });

  test('Rule 7: Should fail when volume capacity is exceeded', () => {
    const bulkyOrder = { ...baseOrder, orderVolumeM3: 7 };
    // current trip volume 2 + 7 = 9 > 8 cap
    const res = constraintValidator.validateAssignment({
      order: bulkyOrder,
      vehicle: baseVehicle,
      trip: baseTrip
    });

    expect(res.valid).toBe(false);
    expect(res.violations.some(v => v.code === 'VOLUME_LIMIT_EXCEEDED')).toBe(true);
  });

  test('Rule 8: Should fail when vehicle exceeds 2 daily trips', () => {
    const res = constraintValidator.validateAssignment({
      order: baseOrder,
      vehicle: baseVehicle,
      trip: { ...baseTrip, tripNumber: 3 },
      context: { vehicleTripsCount: 2 }
    });

    expect(res.valid).toBe(false);
    expect(res.violations.some(v => v.code === 'MAX_TRIP_LIMIT_EXCEEDED')).toBe(true);
  });

  test('Rule 9: Should fail when delivery window is outside allowable hours', () => {
    const res = constraintValidator.validateAssignment({
      order: baseOrder, // Window: 06:00 - 08:00
      vehicle: baseVehicle,
      trip: baseTrip,
      context: { targetArrivalTime: '11:30' }
    });

    expect(res.valid).toBe(false);
    expect(res.violations.some(v => v.code === 'DELIVERY_WINDOW_CONFLICT')).toBe(true);
  });

  test('Rule 10: Should fail when vehicle weekly fuel quota would be exceeded', () => {
    const lowFuelVehicle = {
      ...baseVehicle,
      weeklyFuelQuotaL: 50,
      fuelUsedThisWeek: 48,
      kmPerL: 4
    };
    // Trip km = 20 => requires 5L fuel => 48 + 5 = 53 > 50 quota
    const res = constraintValidator.validateAssignment({
      order: baseOrder,
      vehicle: lowFuelVehicle,
      trip: baseTrip
    });

    expect(res.valid).toBe(false);
    expect(res.violations.some(v => v.code === 'FUEL_LIMIT_EXCEEDED')).toBe(true);
  });
});
