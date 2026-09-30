const DeliveryPlan = require('./deliveryPlan.model');
const Trip = require('../trips/trip.model');
const Order = require('../orders/order.model');
const LoadingJob = require('../loading/loadingJob.model');
const Delivery = require('../deliveries/delivery.model');
const Vehicle = require('../vehicles/vehicle.model');
const constraintValidator = require('../allocation/constraint.validator');
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
  const planRef = `PLAN-${depot.substring(0, 3).toUpperCase()}-${dateStr}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  // Find candidate orders for this delivery date and depot
  const startOfDay = new Date(deliveryDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(deliveryDate);
  endOfDay.setHours(23, 59, 59, 999);

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
  let overallValid = true;

  for (const trip of trips) {
    const vehicle = trip.vehicle;
    const vehicleTripCount = await Trip.countDocuments({
      vehicle: vehicle._id,
      plan: plan._id
    });

    const tripViolations = [];

    // Test each order on the trip
    for (const item of trip.orders) {
      if (!item.order) continue;
      const order = await Order.findById(item.order._id || item.order).populate('outlet');
      if (!order) continue;

      const res = constraintValidator.validateAssignment({
        order,
        vehicle,
        trip,
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

module.exports = {
  createPlan,
  getPlans,
  getPlanById,
  validatePlan,
  publishPlan,
  getUnallocatedOrders
};
