const DeliveryPlan = require('./deliveryPlan.model');
const Trip = require('../trips/trip.model');
const Order = require('../orders/order.model');
const LoadingJob = require('../loading/loadingJob.model');
const Delivery = require('../deliveries/delivery.model');
const Vehicle = require('../vehicles/vehicle.model');
const User = require('../users/user.model');
const constraintValidator = require('../allocation/constraint.validator');
const Deferral = require('../deferrals/deferral.model');
const { getNextSuggestedRun } = require('../../utils/time.util');
const ApiResponse = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const socketService = require('../../services/socket.service');
const auditService = require('../../services/audit.service');

/**
 * Create a new Delivery Plan
 * POST /api/v1/plans
 */
const createPlan = asyncHandler(async (req, res) => {
  const { deliveryDate, depot } = req.body;

  if (!deliveryDate || !depot) {
    return res.status(400).json(new ApiResponse(400, null, 'deliveryDate and depot are required'));
  }

  const dateObj = new Date(deliveryDate);
  const dateStr = dateObj.toISOString().slice(0, 10).replace(/-/g, '');

  // Find candidate orders for this delivery date and depot
  const startOfDay = new Date(deliveryDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(deliveryDate);
  endOfDay.setHours(23, 59, 59, 999);

  const existingCount = await DeliveryPlan.countDocuments({
    depot,
    deliveryDate: { $gte: startOfDay, $lte: endOfDay }
  });
  const revision = String(existingCount + 1).padStart(2, '0');
  const planRef = `PLAN-${depot.substring(0, 3).toUpperCase()}-${dateStr}-${revision}`;

  const candidateOrders = await Order.find({
    requestedDeliveryDate: { $gte: startOfDay, $lte: endOfDay },
    status: { $in: ['CONFIRMED', 'PLANNING'] }
  }).populate('outlet');

  // Filter orders matching depot
  const depotOrders = candidateOrders.filter(o => o.outlet && o.outlet.depot === depot);

  const plan = await DeliveryPlan.create({
    planRef,
    deliveryDate: dateObj,
    depot,
    status: 'DRAFT',
    totalOrders: depotOrders.length,
    servedOrders: [],
    deferredOrders: [],
    createdBy: req.user._id
  });

  res.status(201).json(new ApiResponse(201, plan, 'Delivery plan created in DRAFT'));
});

/**
 * Get all delivery plans
 * GET /api/v1/plans
 */
const getPlans = asyncHandler(async (req, res) => {
  const { depot, status, date } = req.query;
  const filter = {};
  if (depot) filter.depot = depot;
  if (status) filter.status = status;
  if (date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    filter.deliveryDate = { $gte: start, $lte: end };
  }

  const plans = await DeliveryPlan.find(filter)
    .populate('createdBy', 'name email')
    .sort({ deliveryDate: -1, createdAt: -1 });

  res.status(200).json(new ApiResponse(200, plans, `Retrieved ${plans.length} plans`));
});

/**
 * Get delivery plan by ID with trips
 * GET /api/v1/plans/:id
 */
const getPlanById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const plan = await DeliveryPlan.findOne({
    $or: [{ planRef: id }, ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : [])]
  })
    .populate('servedOrders deferredOrders createdBy', '-password');

  if (!plan) {
    return res.status(404).json(new ApiResponse(404, null, 'Plan not found'));
  }

  const trips = await Trip.find({ plan: plan._id })
    .populate('vehicle driver orders.order');

  res.status(200).json(new ApiResponse(200, { plan, trips }, 'Plan details retrieved'));
});

/**
 * Validate a delivery plan against constraints across all its trips
 * POST /api/v1/plans/:id/validate
 */
const validatePlan = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const plan = await DeliveryPlan.findOne({
    $or: [{ planRef: id }, ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : [])]
  });

  if (!plan) {
    return res.status(404).json(new ApiResponse(404, null, 'Plan not found'));
  }

  const trips = await Trip.find({ plan: plan._id }).populate('vehicle orders.order');
  const tripValidationResults = [];

  if (trips.length === 0) {
    plan.status = 'DRAFT';
    plan.validationSummary = {
      evaluatedAt: new Date(),
      overallValid: false,
      message: 'Plan has 0 formed trips. Run Route Allocation Engine or assign vehicles first.',
      tripEvaluations: []
    };
    await plan.save();

    return res.status(200).json(
      new ApiResponse(200, {
        planId: plan._id,
        overallValid: false,
        summary: plan.validationSummary
      }, 'Plan has no assigned trips or vehicles')
    );
  }

  let overallValid = true;

  for (const trip of trips) {
    const vehicle = trip.vehicle;
    const vehicleTripCount = await Trip.countDocuments({
      vehicle: vehicle._id,
      plan: plan._id
    });

    const tripViolations = [];

    // Test each order on the trip without double counting its own weight/volume
    for (const item of trip.orders) {
      if (!item.order) continue;
      const order = await Order.findById(item.order._id || item.order).populate('outlet');
      if (!order) continue;

      // Base trip totals excluding this order
      const existingTripWithoutOrder = {
        ...trip.toObject(),
        totalWeightKg: Math.max(0, (trip.totalWeightKg || 0) - (order.orderWeightKg || 0)),
        totalVolumeM3: Math.max(0, (trip.totalVolumeM3 || 0) - (order.orderVolumeM3 || 0))
      };

      const res = constraintValidator.validateAssignment({
        order,
        vehicle,
        trip: existingTripWithoutOrder,
        context: { vehicleTripsCount: vehicleTripCount }
      });

      if (!res.valid) {
        tripViolations.push({
          orderRef: order.orderRef,
          violations: res.violations
        });
      }
    }

    if (tripViolations.length > 0) {
      overallValid = false;
    }

    tripValidationResults.push({
      tripId: trip._id,
      tripRef: trip.tripRef,
      vehicleId: vehicle.vehicleId,
      valid: tripViolations.length === 0,
      issues: tripViolations
    });
  }

  plan.status = overallValid ? 'READY' : 'VALIDATING';
  plan.validationSummary = {
    evaluatedAt: new Date(),
    overallValid,
    tripEvaluations: tripValidationResults
  };
  await plan.save();

  res.status(200).json(
    new ApiResponse(200, {
      planId: plan._id,
      overallValid,
      summary: plan.validationSummary
    }, overallValid ? 'Plan validation passed' : 'Plan has constraint violations')
  );
});

/**
 * Publish a delivery plan
 * POST /api/v1/plans/:id/publish
 */
const publishPlan = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const plan = await DeliveryPlan.findOne({
    $or: [{ planRef: id }, ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : [])]
  });

  if (!plan) {
    return res.status(404).json(new ApiResponse(404, null, 'Plan not found'));
  }

  const trips = await Trip.find({ plan: plan._id }).populate('vehicle orders.order');

  if (trips.length === 0) {
    return res.status(400).json(new ApiResponse(400, null, 'Cannot publish plan with 0 trips assigned.'));
  }

  if (plan.status !== 'READY') {
    return res.status(400).json(new ApiResponse(400, null, 'Plan must be validated with READY status before publishing. Please validate constraints first.'));
  }

  // 1. Update plan status
  plan.status = 'PUBLISHED';
  plan.publishedAt = new Date();
  await plan.save();

  const generatedLoadingJobs = [];
  const generatedDeliveries = [];

  // 2. Transition trips and orders, create LoadingJobs and Delivery records
  for (const trip of trips) {
    trip.status = 'READY_FOR_LOADING';
    await trip.save();

    // Mark vehicle as ASSIGNED
    if (trip.vehicle) {
      await Vehicle.findByIdAndUpdate(trip.vehicle._id, { status: 'ASSIGNED' });
    }

    // Build LoadingJob items
    const loadingItems = [];
    let seq = 1;

    for (const item of trip.orders) {
      if (!item.order) continue;
      const order = await Order.findById(item.order._id || item.order).populate('outlet');
      if (!order) continue;

      order.status = 'SCHEDULED';
      order.scheduledAt = new Date();
      await order.save();

      loadingItems.push({
        order: order._id,
        expectedQty: order.orderUnits || 1,
        loadedQty: 0,
        status: 'PENDING'
      });

      // Create Delivery stop record for driver
      const delivery = await Delivery.create({
        deliveryRef: `DEL-${order.orderRef}-${seq}`,
        order: order._id,
        trip: trip._id,
        driver: trip.driver,
        outlet: order.outlet._id,
        stopSequence: seq++,
        status: 'PENDING',
        syncStatus: 'SYNCED'
      });
      generatedDeliveries.push(delivery);
    }

    // Create Loading Job
    const loadingJobRef = `LJ-${trip.tripRef || trip._id.toString().slice(-6)}-${Date.now().toString().slice(-4)}`;
    const job = await LoadingJob.create({
      loadingJobRef,
      trip: trip._id,
      vehicle: trip.vehicle._id,
      status: 'PENDING',
      items: loadingItems
    });

    generatedLoadingJobs.push(job);
  }

  // Realtime notification & audit
  socketService.emitPlanPublished(plan);
  await auditService.log({
    user: req.user,
    action: 'PLAN_PUBLISHED',
    entityType: 'DeliveryPlan',
    entityId: plan._id,
    newData: {
      tripsCount: trips.length,
      loadingJobsCount: generatedLoadingJobs.length,
      deliveriesCount: generatedDeliveries.length
    }
  });

  res.status(200).json(
    new ApiResponse(200, {
      plan,
      loadingJobsCount: generatedLoadingJobs.length,
      deliveriesCount: generatedDeliveries.length
    }, 'Delivery plan published successfully')
  );
});

/**
 * Get unallocated orders for a delivery plan
 * GET /api/v1/plans/:id/unallocated-orders
 */
const getUnallocatedOrders = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const plan = await DeliveryPlan.findOne({
    $or: [{ planRef: id }, ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : [])]
  });

  if (!plan) {
    return res.status(404).json(new ApiResponse(404, null, 'Plan not found'));
  }

  // Find all orders for this plan's delivery date & depot not yet in plan.servedOrders
  const startOfDay = new Date(plan.deliveryDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(plan.deliveryDate);
  endOfDay.setHours(23, 59, 59, 999);

  const orders = await Order.find({
    requestedDeliveryDate: { $gte: startOfDay, $lte: endOfDay },
    status: { $in: ['CONFIRMED', 'PLANNING', 'DEFERRED'] },
    _id: { $nin: plan.servedOrders || [] }
  }).populate('outlet');

  // Filter depot
  const unallocated = orders.filter(o => o.outlet && o.outlet.depot === plan.depot);

  res.status(200).json(new ApiResponse(200, unallocated, `Retrieved ${unallocated.length} unallocated orders`));
});

/**
 * Automated allocation engine solver for a delivery plan
 * POST /api/v1/plans/:id/auto-allocate
 */
const autoAllocatePlan = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const plan = await DeliveryPlan.findOne({
    $or: [{ planRef: id }, ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : [])]
  });

  if (!plan) {
    return res.status(404).json(new ApiResponse(404, null, 'Plan not found'));
  }

  if (plan.status === 'PUBLISHED' || plan.status === 'COMPLETED') {
    return res.status(400).json(new ApiResponse(400, null, 'Cannot re-allocate an already published plan'));
  }

  // 1. Fetch candidate orders for this delivery date & depot
  const startOfDay = new Date(plan.deliveryDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(plan.deliveryDate);
  endOfDay.setHours(23, 59, 59, 999);

  const rawOrders = await Order.find({
    requestedDeliveryDate: { $gte: startOfDay, $lte: endOfDay },
    status: { $in: ['CONFIRMED', 'PLANNING', 'DEFERRED'] }
  }).populate('outlet');

  const candidateOrders = rawOrders.filter(o => o.outlet && o.outlet.depot === plan.depot);

  // 2. Clear existing draft trips for clean solve
  await Trip.deleteMany({ plan: plan._id, status: 'PLANNED' });
  plan.servedOrders = [];
  plan.deferredOrders = [];

  // 3. Sort candidate orders by challenge priority:
  // (a) Previously deferred orders first
  // (b) Fresh orders next (08:00 AM delivery window deadline)
  // (c) Smallest orders first to pack efficiently
  candidateOrders.sort((a, b) => {
    const aDef = a.deferredCount || 0;
    const bDef = b.deferredCount || 0;
    if (bDef !== aDef) return bDef - aDef;
    if (a.brand === 'Fresh' && b.brand !== 'Fresh') return -1;
    if (b.brand === 'Fresh' && a.brand !== 'Fresh') return 1;
    return (a.orderWeightKg || 0) - (b.orderWeightKg || 0);
  });

  // 4. Fetch available vehicles and drivers at this depot
  const depotVehicles = await Vehicle.find({
    depot: plan.depot,
    status: { $in: ['AVAILABLE', 'ASSIGNED'] }
  }).sort({ weeklyFuelQuotaL: -1 });

  const depotDrivers = await User.find({
    role: 'DRIVER',
    depot: plan.depot
  });

  // 5. Cluster orders by Brand + District
  const clusters = {};
  for (const order of candidateOrders) {
    const district = order.outlet.district || 'Colombo';
    const key = `${order.brand}__${district}`;
    if (!clusters[key]) clusters[key] = [];
    clusters[key].push(order);
  }

  const generatedTrips = [];

  // 6. Allocate each cluster
  for (const [clusterKey, ordersInCluster] of Object.entries(clusters)) {
    const [brand, district] = clusterKey.split('__');
    const isFresh = brand === 'Fresh';
    const timeLimitMinutes = isFresh ? 270 : 480;

    for (const order of ordersInCluster) {
      let assigned = false;

      // Try adding to an existing generated trip in this cluster
      for (const trip of generatedTrips) {
        if (trip.brand !== brand || trip.district !== district) continue;
        const vehicle = depotVehicles.find(v => v._id.toString() === trip.vehicle.toString());
        if (!vehicle) continue;

        const nextWeight = (trip.totalWeightKg || 0) + (order.orderWeightKg || 0);
        const nextVolume = (trip.totalVolumeM3 || 0) + (order.orderVolumeM3 || 0);
        const stopsCount = trip.orders.length + 1;
        const estimatedTime = (isFresh ? 45 : 60) + (stopsCount * 25);

        const fitsCapacity = nextWeight <= vehicle.weightCapKg && nextVolume <= vehicle.volumeCapM3;
        const fitsTime = estimatedTime <= timeLimitMinutes;
        const fitsTemp = order.tempRequirement !== 'chilled' || vehicle.temp === 'reefer';
        const fitsAccess = order.outlet.parkingConstraint !== 'van_only' || vehicle.type === 'van';

        if (fitsCapacity && fitsTime && fitsTemp && fitsAccess) {
          trip.orders.push({ order: order._id, stopSequence: stopsCount });
          trip.totalWeightKg = nextWeight;
          trip.totalVolumeM3 = nextVolume;
          trip.estimatedMinutes = estimatedTime;
          trip.estimatedDistanceKm = 20 + (stopsCount * 8);
          await trip.save();

          plan.servedOrders.push(order._id);
          order.status = 'PLANNING';
          await order.save();
          assigned = true;
          break;
        }
      }

      if (assigned) continue;

      // Try creating a new trip on an eligible vehicle
      for (const vehicle of depotVehicles) {
        const vehicleTrips = generatedTrips.filter(t => t.vehicle.toString() === vehicle._id.toString());
        if (vehicleTrips.length >= 2) continue; // Max 2 trips per day per vehicle

        const fitsTemp = order.tempRequirement !== 'chilled' || vehicle.temp === 'reefer';
        const fitsAccess = order.outlet.parkingConstraint !== 'van_only' || vehicle.type === 'van';
        const fitsWeight = (order.orderWeightKg || 0) <= vehicle.weightCapKg;
        const fitsVolume = (order.orderVolumeM3 || 0) <= vehicle.volumeCapM3;

        if (fitsTemp && fitsAccess && fitsWeight && fitsVolume) {
          const tripNumber = vehicleTrips.length + 1;
          const planDateStr = new Date(plan.deliveryDate).toISOString().slice(0, 10).replace(/-/g, '');
          const tripRef = `TRIP-${vehicle.vehicleId}-${planDateStr}-T${tripNumber}`;
          const driverId = vehicle.assignedDriver || (depotDrivers.length > 0 ? depotDrivers[generatedTrips.length % depotDrivers.length]._id : null);

          const newTrip = await Trip.create({
            tripRef,
            plan: plan._id,
            vehicle: vehicle._id,
            driver: driverId,
            tripNumber,
            brand,
            district,
            orders: [{ order: order._id, stopSequence: 1 }],
            totalWeightKg: order.orderWeightKg || 0,
            totalVolumeM3: order.orderVolumeM3 || 0,
            estimatedMinutes: isFresh ? 90 : 150,
            estimatedDistanceKm: 28,
            status: 'PLANNED'
          });

          generatedTrips.push(newTrip);
          plan.servedOrders.push(order._id);
          order.status = 'PLANNING';
          await order.save();
          assigned = true;
          break;
        }
      }

      // If cannot fit, formally defer
      if (!assigned) {
        const prevCount = order.deferredCount || 0;
        const reasonCode = order.tempRequirement === 'chilled' ? 'NO_REEFER_CAPACITY' : 'NO_VEHICLE_CAPACITY';
        const reason = `Automated solver: ${order.brand} order in ${district} exceeded fleet payload/refrigeration availability for ${plan.deliveryDate.toISOString().slice(0, 10)}`;

        await Deferral.create({
          order: order._id,
          plan: plan._id,
          reasonCode,
          reason,
          deferredBy: req.user._id,
          deferredAt: new Date(),
          nextSuggestedRun: getNextSuggestedRun(order.requestedDeliveryDate),
          previousDeferralCount: prevCount
        });

        order.status = 'DEFERRED';
        order.deferredCount = prevCount + 1;
        order.lastDeferredAt = new Date();
        await order.save();

        if (!plan.deferredOrders.includes(order._id)) {
          plan.deferredOrders.push(order._id);
        }
      }
    }
  }

  // Evaluate plan status & constraint validation
  if (generatedTrips.length === 0) {
    plan.status = 'DRAFT';
    plan.validationSummary = {
      evaluatedAt: new Date(),
      overallValid: false,
      message: '0 trips formed. All candidate orders deferred due to capacity constraints or no candidate orders found.',
      tripEvaluations: []
    };
  } else {
    let overallValid = true;
    const tripValidationResults = [];
    const populatedTrips = await Trip.find({ plan: plan._id }).populate('vehicle orders.order');

    for (const trip of populatedTrips) {
      const vehicle = trip.vehicle;
      const vehicleTripCount = await Trip.countDocuments({ vehicle: vehicle._id, plan: plan._id });
      const tripViolations = [];

      for (const item of trip.orders) {
        if (!item.order) continue;
        const order = await Order.findById(item.order._id || item.order).populate('outlet');
        if (!order) continue;

        const existingTripWithoutOrder = {
          ...trip.toObject(),
          totalWeightKg: Math.max(0, (trip.totalWeightKg || 0) - (order.orderWeightKg || 0)),
          totalVolumeM3: Math.max(0, (trip.totalVolumeM3 || 0) - (order.orderVolumeM3 || 0))
        };

        const resVal = constraintValidator.validateAssignment({
          order,
          vehicle,
          trip: existingTripWithoutOrder,
          context: { vehicleTripsCount: vehicleTripCount }
        });

        if (!resVal.valid) {
          tripViolations.push({ orderRef: order.orderRef, violations: resVal.violations });
        }
      }

      if (tripViolations.length > 0) overallValid = false;
      tripValidationResults.push({
        tripId: trip._id,
        tripRef: trip.tripRef,
        vehicleId: vehicle?.vehicleId,
        valid: tripViolations.length === 0,
        issues: tripViolations
      });
    }

    plan.status = overallValid ? 'READY' : 'DRAFT';
    plan.validationSummary = {
      evaluatedAt: new Date(),
      overallValid,
      tripEvaluations: tripValidationResults
    };
  }

  plan.totalOrders = plan.servedOrders.length + plan.deferredOrders.length;
  await plan.save();

  await auditService.log({
    user: req.user,
    action: 'OTHER',
    entityType: 'DeliveryPlan',
    entityId: plan._id,
    newData: {
      tripsCreated: generatedTrips.length,
      ordersServed: plan.servedOrders.length,
      ordersDeferred: plan.deferredOrders.length
    },
    reason: `Automated route allocation solver completed for ${plan.depot} depot on ${plan.deliveryDate.toISOString().slice(0, 10)}`
  });

  const populatedTrips = await Trip.find({ plan: plan._id }).populate('vehicle driver orders.order');

  res.status(200).json(
    new ApiResponse(200, {
      plan,
      tripsCount: populatedTrips.length,
      servedOrdersCount: plan.servedOrders.length,
      deferredOrdersCount: plan.deferredOrders.length,
      trips: populatedTrips
    }, 'Automated allocation solver complete')
  );
});

module.exports = {
  createPlan,
  getPlans,
  getPlanById,
  validatePlan,
  publishPlan,
  getUnallocatedOrders,
  autoAllocatePlan
};
