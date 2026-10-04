const Trip = require('./trip.model');
const Vehicle = require('../vehicles/vehicle.model');
const Delivery = require('../deliveries/delivery.model');
const Order = require('../orders/order.model');
const User = require('../users/user.model');
const Deferral = require('../deferrals/deferral.model');
const constraintValidator = require('../allocation/constraint.validator');
const ApiResponse = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const socketService = require('../../services/socket.service');
const auditService = require('../../services/audit.service');
const { getNextSuggestedRun } = require('../../utils/time.util');

/**
 * Get all trips with filters
 * GET /api/v1/trips
 */
const getTrips = asyncHandler(async (req, res) => {
  const { planId, status, vehicleId, driverId } = req.query;
  const filter = {};
  if (planId) filter.plan = planId;
  if (status) filter.status = status;
  if (vehicleId) filter.vehicle = vehicleId;
  if (driverId) filter.driver = driverId;

  const trips = await Trip.find(filter)
    .populate('vehicle driver plan')
    .populate({
      path: 'orders.order',
      populate: { path: 'outlet' }
    })
    .sort({ createdAt: -1 });

  res.status(200).json(new ApiResponse(200, trips, `Retrieved ${trips.length} trips`));
});

/**
 * Get trip by ID
 * GET /api/v1/trips/:tripId
 */
const getTripById = asyncHandler(async (req, res) => {
  const { tripId } = req.params;
  const trip = await Trip.findOne({
    $or: [{ tripRef: tripId }, ...(tripId.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: tripId }] : [])]
  })
    .populate('vehicle driver plan')
    .populate({
      path: 'orders.order',
      populate: { path: 'outlet' }
    });

  if (!trip) {
    return res.status(404).json(new ApiResponse(404, null, 'Trip not found'));
  }

  res.status(200).json(new ApiResponse(200, trip, 'Trip retrieved'));
});

/**
 * Reassign an interrupted/broken-down trip to a replacement vehicle
 * POST /api/v1/trips/:tripId/reassign-vehicle
 */
const reassignVehicle = asyncHandler(async (req, res) => {
  const { tripId } = req.params;
  const { newVehicleId, reason } = req.body;

  const trip = await Trip.findOne({
    $or: [{ tripRef: tripId }, ...(tripId.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: tripId }] : [])]
  }).populate('orders.order');

  if (!trip) {
    return res.status(404).json(new ApiResponse(404, null, 'Trip not found'));
  }

  const replacementVehicle = await Vehicle.findOne({
    $or: [{ vehicleId: newVehicleId }, ...(newVehicleId && newVehicleId.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: newVehicleId }] : [])]
  });

  if (!replacementVehicle) {
    return res.status(404).json(new ApiResponse(404, null, 'Replacement vehicle not found'));
  }

  // Validate replacement vehicle capacity against remaining/current trip load
  if (trip.totalWeightKg > replacementVehicle.weightCapKg) {
    return res.status(400).json(
      new ApiResponse(400, null, `Replacement vehicle weight cap (${replacementVehicle.weightCapKg}kg) is less than trip weight (${trip.totalWeightKg}kg)`)
    );
  }

  const oldVehicleId = trip.vehicle;
  trip.vehicle = replacementVehicle._id;
  trip.status = 'IN_TRANSIT';
  await trip.save();

  // Mark old vehicle unavailable and new vehicle assigned
  if (oldVehicleId) {
    await Vehicle.findByIdAndUpdate(oldVehicleId, { status: 'UNAVAILABLE' });
  }
  await Vehicle.findByIdAndUpdate(replacementVehicle._id, { status: 'ASSIGNED' });

  // Realtime notification
  socketService.emitRouteUpdated(trip);
  await auditService.log({
    user: req.user,
    action: 'ROUTE_REASSIGNED',
    entityType: 'Trip',
    entityId: trip._id,
    reason: reason || 'Vehicle reassigned due to incident/breakdown',
    previousData: { vehicle: oldVehicleId },
    newData: { vehicle: replacementVehicle._id }
  });

  const updatedTrip = await Trip.findById(trip._id).populate('vehicle driver plan');

  res.status(200).json(
    new ApiResponse(200, updatedTrip, 'Vehicle reassigned successfully to trip')
  );
});

/**
 * Assign a driver to a trip (Dispatcher or Admin assignment)
 * POST /api/v1/trips/:tripId/assign-driver
 */
const assignDriver = asyncHandler(async (req, res) => {
  const { tripId } = req.params;
  const { driverId } = req.body;

  const trip = await Trip.findOne({
    $or: [{ tripRef: tripId }, ...(tripId.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: tripId }] : [])]
  });

  if (!trip) {
    return res.status(404).json(new ApiResponse(404, null, 'Trip not found'));
  }

  let driver = null;
  if (driverId) {
    driver = await User.findById(driverId);
    if (!driver || driver.role !== 'DRIVER') {
      return res.status(400).json(new ApiResponse(400, null, 'Valid driver ID is required'));
    }
  }

  trip.driver = driver ? driver._id : null;
  await trip.save();

  // Also update associated Delivery records driver reference
  await Delivery.updateMany({ trip: trip._id }, { driver: trip.driver });

  socketService.emitRouteUpdated(trip);

  const populatedTrip = await Trip.findById(trip._id).populate('vehicle driver plan');
  res.status(200).json(new ApiResponse(200, populatedTrip, driver ? `Driver ${driver.name} assigned to trip` : 'Driver unassigned from trip'));
});


/**
 * Defer remaining undelivered orders on an interrupted trip
 * POST /api/v1/trips/:tripId/defer-remaining-orders
 */
const deferRemainingOrders = asyncHandler(async (req, res) => {
  const { tripId } = req.params;
  const { reason = 'Trip cancelled due to vehicle breakdown / unforeseen disruption' } = req.body;

  const trip = await Trip.findOne({
    $or: [{ tripRef: tripId }, ...(tripId.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: tripId }] : [])]
  });

  if (!trip) {
    return res.status(404).json(new ApiResponse(404, null, 'Trip not found'));
  }

  // Find all deliveries in this trip that are not yet delivered
  const pendingDeliveries = await Delivery.find({
    trip: trip._id,
    status: { $in: ['PENDING', 'ARRIVED'] }
  }).populate('order');

  const deferredList = [];

  for (const delivery of pendingDeliveries) {
    if (!delivery.order) continue;
    const order = await Order.findById(delivery.order._id || delivery.order);
    if (!order) continue;

    const previousCount = order.deferredCount || 0;
    order.status = 'DEFERRED';
    order.deferredCount = previousCount + 1;
    order.lastDeferredAt = new Date();
    await order.save();

    const def = await Deferral.create({
      order: order._id,
      plan: trip.plan,
      reasonCode: 'VEHICLE_BREAKDOWN',
      reason,
      deferredBy: req.user._id,
      deferredAt: new Date(),
      nextSuggestedRun: getNextSuggestedRun(order.requestedDeliveryDate),
      previousDeferralCount: previousCount
    });

    delivery.status = 'FAILED';
    await delivery.save();

    deferredList.push(def);
    socketService.emitOrderDeferred(def);
  }

  trip.status = 'INTERRUPTED';
  await trip.save();

  res.status(200).json(
    new ApiResponse(200, { deferredCount: deferredList.length, deferredList }, 'Remaining orders deferred')
  );
});

/**
 * Start a planned trip run (Driver pre-departure execution)
 * POST /api/v1/trips/:tripId/start
 */
const startTrip = asyncHandler(async (req, res) => {
  const { tripId } = req.params;
  const trip = await Trip.findOne({
    $or: [{ tripRef: tripId }, ...(tripId.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: tripId }] : [])]
  }).populate('vehicle driver plan');

  if (!trip) {
    return res.status(404).json(new ApiResponse(404, null, 'Trip not found'));
  }

  trip.status = 'IN_TRANSIT';
  trip.startedAt = new Date();
  if (!trip.driver && req.user._id) {
    trip.driver = req.user._id;
  }
  await trip.save();

  if (trip.vehicle) {
    await Vehicle.findByIdAndUpdate(trip.vehicle._id, { status: 'IN_TRANSIT' });
  }

  socketService.emitTripStarted(trip);
  await auditService.log({
    user: req.user,
    action: 'OTHER',
    entityType: 'Trip',
    entityId: trip._id,
    newData: { status: 'IN_TRANSIT', startedAt: trip.startedAt },
    reason: `Driver initiated delivery run for ${trip.tripRef}`
  });

  res.status(200).json(new ApiResponse(200, trip, 'Trip started successfully'));
});

/**
 * Complete a trip run
 * POST /api/v1/trips/:tripId/complete
 */
const completeTrip = asyncHandler(async (req, res) => {
  const { tripId } = req.params;
  const trip = await Trip.findOne({
    $or: [{ tripRef: tripId }, ...(tripId.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: tripId }] : [])]
  });

  if (!trip) {
    return res.status(404).json(new ApiResponse(404, null, 'Trip not found'));
  }

  trip.status = 'COMPLETED';
  trip.completedAt = new Date();
  await trip.save();

  if (trip.vehicle) {
    await Vehicle.findByIdAndUpdate(trip.vehicle, { status: 'AVAILABLE' });
  }

  await auditService.log({
    user: req.user,
    action: 'OTHER',
    entityType: 'Trip',
    entityId: trip._id,
    newData: { status: 'COMPLETED', completedAt: trip.completedAt },
    reason: `Trip run ${trip.tripRef} completed`
  });

  res.status(200).json(new ApiResponse(200, trip, 'Trip completed successfully'));
});

/**
 * Reorder stops on a planned trip
 * PATCH /api/v1/trips/:tripId/reorder-stops
 */
const reorderTripStops = asyncHandler(async (req, res) => {
  const { tripId } = req.params;
  const { stopOrderIds } = req.body; // Array of orderIds in desired sequence

  const trip = await Trip.findOne({
    $or: [{ tripRef: tripId }, ...(tripId.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: tripId }] : [])]
  }).populate('orders.order');

  if (!trip) {
    return res.status(404).json(new ApiResponse(404, null, 'Trip not found'));
  }

  if (trip.status !== 'PLANNED') {
    return res.status(400).json(new ApiResponse(400, null, 'Can only reorder stops on un-published PLANNED trips'));
  }

  if (!Array.isArray(stopOrderIds) || stopOrderIds.length !== trip.orders.length) {
    return res.status(400).json(new ApiResponse(400, null, 'stopOrderIds array must contain all trip order IDs in new sequence'));
  }

  const newOrders = [];
  let seq = 1;
  for (const oId of stopOrderIds) {
    const existing = trip.orders.find(item => (item.order?._id || item.order).toString() === oId.toString());
    if (existing) {
      newOrders.push({
        order: existing.order._id || existing.order,
        stopSequence: seq++
      });
    }
  }

  trip.orders = newOrders;
  await trip.save();

  res.status(200).json(new ApiResponse(200, trip, 'Trip stop sequence updated'));
});

/**
 * Unassign an order from a trip back to the unallocated pool
 * POST /api/v1/trips/:tripId/unassign-order
 */
const unassignTripOrder = asyncHandler(async (req, res) => {
  const { tripId } = req.params;
  const { orderId } = req.body;

  const trip = await Trip.findOne({
    $or: [{ tripRef: tripId }, ...(tripId.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: tripId }] : [])]
  }).populate('orders.order');

  if (!trip) {
    return res.status(404).json(new ApiResponse(404, null, 'Trip not found'));
  }

  if (trip.status !== 'PLANNED') {
    return res.status(400).json(new ApiResponse(400, null, 'Cannot unassign order from a published/active trip'));
  }

  const orderItem = trip.orders.find(item => (item.order?._id || item.order).toString() === orderId.toString());
  if (!orderItem) {
    return res.status(404).json(new ApiResponse(404, null, 'Order not present on this trip'));
  }

  const order = await Order.findById(orderId);
  if (order) {
    order.status = 'CONFIRMED';
    await order.save();
  }

  trip.orders = trip.orders.filter(item => (item.order?._id || item.order).toString() !== orderId.toString());
  trip.totalWeightKg = Math.max(0, (trip.totalWeightKg || 0) - (order?.orderWeightKg || 0));
  trip.totalVolumeM3 = Math.max(0, (trip.totalVolumeM3 || 0) - (order?.orderVolumeM3 || 0));

  // Re-sequence remaining
  trip.orders.forEach((item, idx) => {
    item.stopSequence = idx + 1;
  });

  if (trip.orders.length === 0) {
    await Trip.findByIdAndDelete(trip._id);
  } else {
    await trip.save();
  }

  // Update plan servedOrders
  const DeliveryPlan = require('../planning/deliveryPlan.model');
  await DeliveryPlan.findByIdAndUpdate(trip.plan, {
    $pull: { servedOrders: orderId }
  });

  res.status(200).json(new ApiResponse(200, { tripId: trip._id, unassignedOrder: orderId }, 'Order unassigned successfully'));
});

module.exports = {
  getTrips,
  getTripById,
  assignDriver,
  reassignVehicle,
  deferRemainingOrders,
  startTrip,
  completeTrip,
  reorderTripStops,
  unassignTripOrder
};
