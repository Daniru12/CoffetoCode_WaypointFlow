const timeUtil = require('../utils/time.util');
const tripPlanningService = require('../modules/planning/tripPlanning.service');

console.log('Testing Order Generation, 16:00 Cutoff, and Trip Budgets...');

// 1. Test 16:00 Cutoff calculations
timeUtil.setSimulatedTime('14:30'); // Pre-cutoff
console.log('Pre-Cutoff (14:30):', timeUtil.isCutoffPassed());
if (timeUtil.isCutoffPassed() !== false) {
  console.error('FAIL: Expected false at 14:30');
  process.exit(1);
}

timeUtil.setSimulatedTime('16:15'); // Post-cutoff
console.log('Post-Cutoff (16:15):', timeUtil.isCutoffPassed());
if (timeUtil.isCutoffPassed() !== true) {
  console.error('FAIL: Expected true at 16:15');
  process.exit(1);
}

const countdown = timeUtil.getTimeUntilCutoff();
console.log('Post-cutoff countdown status:', countdown.passed, countdown.message);

// Reset simulation time
timeUtil.resetSimulatedTime();

// 2. Test Official Trip Planning Service
const gampahaTrip = tripPlanningService.calculateTripTime('Gampaha', 'Fresh', [
  { outlet: { dockType: 'rear_dock' } },
  { outlet: { dockType: 'rear_dock' } },
  { outlet: { dockType: 'street' } }
]);
console.log('Gampaha Trip (Booklet p.21):', gampahaTrip);
if (gampahaTrip.totalMinutes !== 101) {
  console.error('FAIL: Gampaha trip totalMinutes expected 101, got', gampahaTrip.totalMinutes);
  process.exit(1);
}

const colomboTrip = tripPlanningService.calculateTripTime('Colombo', 'Fresh', [
  { outlet: { dockType: 'street' } },
  { outlet: { dockType: 'street' } },
  { outlet: { dockType: 'street' } },
  { outlet: { dockType: 'street' } }
]);
console.log('Colombo Trip (Booklet p.21):', colomboTrip);
if (colomboTrip.totalMinutes !== 112) {
  console.error('FAIL: Colombo trip totalMinutes expected 112, got', colomboTrip.totalMinutes);
  process.exit(1);
}

// 3. Test Cumulative Budget Check (213 minutes <= 270 minutes limit)
const vehicle = { vehicleId: 'VEH014' };
const mockTrips = [
  {
    brand: 'Fresh',
    district: 'Gampaha',
    orders: [
      { order: { outlet: { dockType: 'rear_dock' } } },
      { order: { outlet: { dockType: 'rear_dock' } } },
      { order: { outlet: { dockType: 'street' } } }
    ]
  },
  {
    brand: 'Fresh',
    district: 'Colombo',
    orders: [
      { order: { outlet: { dockType: 'street' } } },
      { order: { outlet: { dockType: 'street' } } },
      { order: { outlet: { dockType: 'street' } } },
      { order: { outlet: { dockType: 'street' } } }
    ]
  }
];

const budgetCheck = tripPlanningService.validateVehicleBudget(vehicle, mockTrips);
console.log('Budget Check (2 runs, 213m/270m):', budgetCheck);
if (!budgetCheck.valid || budgetCheck.freshMinutes !== 213 || budgetCheck.freshBudgetRemaining !== 57) {
  console.error('FAIL: Cumulative budget check mismatch');
  process.exit(1);
}

// Test 3 trips violation (max 2 per day)
const thirdTrip = { brand: 'Fresh', district: 'Colombo', orders: [] };
const overTripCheck = tripPlanningService.validateVehicleBudget(vehicle, [...mockTrips, thirdTrip]);
console.log('3-Trip Violation Check:', overTripCheck.valid, overTripCheck.code);
if (overTripCheck.valid !== false || overTripCheck.code !== 'MAX_TRIPS_EXCEEDED') {
  console.error('FAIL: Max 2 trips per vehicle rule not triggered');
  process.exit(1);
}

console.log('✓ All time calculations, 16:00 cutoff logic, and budget invariants passed!');
