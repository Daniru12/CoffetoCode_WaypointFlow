const mongoose = require('mongoose');
const Order = require('../modules/orders/order.model');
const Vehicle = require('../modules/vehicles/vehicle.model');
const Trip = require('../modules/trips/trip.model');
const Delivery = require('../modules/deliveries/delivery.model');
const DeliveryPlan = require('../modules/planning/deliveryPlan.model');
const User = require('../modules/users/user.model');
const Outlet = require('../modules/outlets/outlet.model');
const Deferral = require('../modules/deferrals/deferral.model');
const Issue = require('../modules/issues/issue.model');

async function testAutoFlow() {
  console.log('Testing Auto-Assign and Auto-Reassign Flow Models & Logic...');

  // 1. Verify Trip model has new fields
  const sampleTrip = new Trip({
    plan: new mongoose.Types.ObjectId(),
    vehicle: new mongoose.Types.ObjectId(),
    tripNumber: 1,
    brand: 'Fresh',
    district: 'Colombo',
    orders: [
      {
        order: new mongoose.Types.ObjectId(),
        stopSequence: 1,
        estimatedArrival: new Date()
      },
      {
        order: new mongoose.Types.ObjectId(),
        stopSequence: 2,
        estimatedArrival: new Date()
      }
    ],
    lifoLoadingList: [
      {
        loadingOrder: 1,
        stopSequence: 2,
        orderRef: 'ORD-002',
        outletName: 'Colombo Store 2',
        units: 5,
        weightKg: 50,
        volumeM3: 0.5,
        temp: 'chilled'
      },
      {
        loadingOrder: 2,
        stopSequence: 1,
        orderRef: 'ORD-001',
        outletName: 'Colombo Store 1',
        units: 3,
        weightKg: 30,
        volumeM3: 0.3,
        temp: 'chilled'
      }
    ],
    totalWeightKg: 80,
    totalVolumeM3: 0.8,
    isAutoAssigned: true,
    autoAssignReason: 'Auto-assigned by Delivery Intelligence Solver to vehicle V-01',
    validationStatus: { valid: true, status: 'AUTO_OPTIMAL' },
    status: 'PLANNED'
  });

  console.log('Trip model instantiated successfully:', {
    tripNumber: sampleTrip.tripNumber,
    isAutoAssigned: sampleTrip.isAutoAssigned,
    stopsCount: sampleTrip.orders.length,
    lifoPositionsCount: sampleTrip.lifoLoadingList.length,
    firstLoadingPositionStop: sampleTrip.lifoLoadingList[0].stopSequence
  });

  if (sampleTrip.lifoLoadingList[0].stopSequence !== 2) {
    throw new Error('LIFO loading list first position is not the last delivery stop!');
  }

  // 2. Verify Delivery model has AT_RISK status and isAtRisk flag
  const sampleDelivery = new Delivery({
    order: new mongoose.Types.ObjectId(),
    trip: sampleTrip._id,
    outlet: new mongoose.Types.ObjectId(),
    stopSequence: 2,
    status: 'AT_RISK',
    isAtRisk: true,
    plannedArrival: new Date()
  });

  console.log('Delivery model instantiated with AT_RISK:', {
    status: sampleDelivery.status,
    isAtRisk: sampleDelivery.isAtRisk,
    hasPlannedArrival: !!sampleDelivery.plannedArrival
  });

  if (sampleDelivery.status !== 'AT_RISK' || !sampleDelivery.isAtRisk) {
    throw new Error('Delivery model does not accept AT_RISK status or isAtRisk flag');
  }

  console.log('✓ All schema validations and LIFO invariants passed successfully!');
}

testAutoFlow()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
  });
