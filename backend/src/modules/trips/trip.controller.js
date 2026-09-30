const Trip = require('./trip.model');
const Vehicle = require('../vehicles/vehicle.model');
const Delivery = require('../deliveries/delivery.model');
const Order = require('../orders/order.model');
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

module.exports = {
  getTrips,
  getTripById,
  reassignVehicle,
  deferRemainingOrders
};
