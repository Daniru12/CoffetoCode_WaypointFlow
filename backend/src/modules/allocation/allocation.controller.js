const allocationEngine = require('./allocation.engine');
const Order = require('../orders/order.model');
const Vehicle = require('../vehicles/vehicle.model');
const Trip = require('../trips/trip.model');
const DeliveryPlan = require('../planning/deliveryPlan.model');
const ApiResponse = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const auditService = require('../../services/audit.service');

/**
 * Get compatible vehicles for an order with explainable constraint outputs
 * GET /api/v1/allocation/orders/:orderId/compatible-vehicles
 */
const getCompatibleVehicles = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { tripId } = req.query;

  const order = await Order.findOne({
    $or: [{ orderRef: orderId }, ...(orderId.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: orderId }] : [])]
  }).populate('outlet');

  if (!order) {
    return res.status(404).json(new ApiResponse(404, null, 'Order not found'));
  }

  let trip = null;
  if (tripId) {
    trip = await Trip.findById(tripId);
  }

  const result = await allocationEngine.getCompatibleVehicles(order, trip);
  res.status(200).json(new ApiResponse(200, result, 'Compatible vehicles evaluated'));
});

/**
 * Validate a proposed assignment without committing
 * POST /api/v1/allocation/validate
 */
const validateAllocation = asyncHandler(async (req, res) => {
  const { orderId, vehicleId, tripId } = req.body;

  const order = await Order.findOne({
    $or: [{ orderRef: orderId }, ...(orderId.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: orderId }] : [])]
  }).populate('outlet');

  const vehicle = await Vehicle.findOne({
    $or: [{ vehicleId }, ...(vehicleId && vehicleId.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: vehicleId }] : [])]
  });

  if (!order || !vehicle) {
    return res.status(400).json(new ApiResponse(400, null, 'Valid order and vehicle are required'));
  }

  let trip = null;
  if (tripId) {
    trip = await Trip.findById(tripId);
  }

  const result = await allocationEngine.validateProposedAssignment(order, vehicle, trip);
  res.status(200).json(new ApiResponse(200, result, result.valid ? 'Assignment is valid' : 'Assignment has constraint violations'));
});

/**
 * Assign an order to a vehicle / trip
 * POST /api/v1/allocation/assign
 */
const assignOrder = asyncHandler(async (req, res) => {
  const { planId, vehicleId, orderId, tripNumber = 1, stopSequence } = req.body;

  const plan = await DeliveryPlan.findOne({
    $or: [{ planRef: planId }, ...(planId && planId.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: planId }] : [])]
  });
  if (!plan) {
    return res.status(404).json(new ApiResponse(404, null, 'Delivery plan not found'));
  }

  const vehicle = await Vehicle.findOne({
    $or: [{ vehicleId }, ...(vehicleId && vehicleId.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: vehicleId }] : [])]
  });
  if (!vehicle) {
    return res.status(404).json(new ApiResponse(404, null, 'Vehicle not found'));
  }

  const order = await Order.findOne({
    $or: [{ orderRef: orderId }, ...(orderId && orderId.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: orderId }] : [])]
  }).populate('outlet');
  if (!order) {
    return res.status(404).json(new ApiResponse(404, null, 'Order not found'));
  }

  // Find or create trip for this vehicle in this plan
  let trip = await Trip.findOne({
    plan: plan._id,
    vehicle: vehicle._id,
    tripNumber
  });

  if (!trip) {
    const tripRef = `TRIP-${vehicle.vehicleId}-T${tripNumber}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    trip = await Trip.create({
      tripRef,
      plan: plan._id,
      vehicle: vehicle._id,
      driver: vehicle.assignedDriver || null,
      tripNumber,
      brand: order.brand,
      district: order.outlet?.district || '',
      orders: [],
      totalWeightKg: 0,
      totalVolumeM3: 0,
      estimatedDistanceKm: 25,
      estimatedMinutes: 60,
      status: 'PLANNED'
    });
  }

  // Validate constraints
  const validation = await allocationEngine.validateProposedAssignment(order, vehicle, trip);
  if (!validation.valid) {
    await auditService.log({
      user: req.user,
      action: 'ASSIGNMENT_REJECTED',
      entityType: 'Trip',
      entityId: trip._id,
      reason: validation.violations.map(v => v.message).join(' | ')
    });

    return res.status(422).json(
      new ApiResponse(422, { violations: validation.violations }, 'Assignment rejected due to constraint violations')
    );
  }

  // Check if order already in trip
  const alreadyInTrip = trip.orders.some(o => o.order.toString() === order._id.toString());
  if (!alreadyInTrip) {
    const sequence = stopSequence || (trip.orders.length + 1);
    trip.orders.push({ order: order._id, stopSequence: sequence });
    trip.totalWeightKg = (trip.totalWeightKg || 0) + (order.orderWeightKg || 0);
    trip.totalVolumeM3 = (trip.totalVolumeM3 || 0) + (order.orderVolumeM3 || 0);
    await trip.save();
  }

  // Update order status
  order.status = 'PLANNING';
  await order.save();

  // Update plan servedOrders
  if (!plan.servedOrders.includes(order._id)) {
    plan.servedOrders.push(order._id);
    await plan.save();
  }

  await auditService.log({
    user: req.user,
    action: 'VEHICLE_ASSIGNED',
    entityType: 'Trip',
    entityId: trip._id,
    newData: { orderId: order._id, vehicleId: vehicle._id, tripId: trip._id }
  });

  const updatedTrip = await Trip.findById(trip._id).populate('vehicle driver orders.order');

  res.status(200).json(
    new ApiResponse(200, { trip: updatedTrip, order }, 'Order assigned successfully')
  );
});

/**
 * Update an assignment (stop sequence or reorder)
 * PATCH /api/v1/allocation/:assignmentId
 */
const updateAssignment = asyncHandler(async (req, res) => {
  const { assignmentId } = req.params; // Trip ID
  const { stopSequence, orderId } = req.body;

  const trip = await Trip.findById(assignmentId);
  if (!trip) {
    return res.status(404).json(new ApiResponse(404, null, 'Trip not found'));
  }

  const orderItem = trip.orders.find(o => o.order.toString() === orderId);
  if (orderItem && stopSequence !== undefined) {
    orderItem.stopSequence = stopSequence;
    await trip.save();
  }

  res.status(200).json(new ApiResponse(200, trip, 'Assignment updated'));
});

/**
 * Remove an order assignment from a trip
 * DELETE /api/v1/allocation/:assignmentId?orderId=...
 */
const removeAssignment = asyncHandler(async (req, res) => {
  const { assignmentId } = req.params; // Trip ID
  const { orderId } = req.query;

  const trip = await Trip.findById(assignmentId);
  if (!trip) {
    return res.status(404).json(new ApiResponse(404, null, 'Trip not found'));
  }

  const order = await Order.findById(orderId);
  if (order) {
    trip.orders = trip.orders.filter(o => o.order.toString() !== order._id.toString());
    trip.totalWeightKg = Math.max(0, (trip.totalWeightKg || 0) - (order.orderWeightKg || 0));
    trip.totalVolumeM3 = Math.max(0, (trip.totalVolumeM3 || 0) - (order.orderVolumeM3 || 0));
    await trip.save();

    order.status = 'CONFIRMED';
    await order.save();

    await DeliveryPlan.findByIdAndUpdate(trip.plan, {
      $pull: { servedOrders: order._id }
    });
  }

  res.status(200).json(new ApiResponse(200, trip, 'Assignment removed'));
});

module.exports = {
  getCompatibleVehicles,
  validateAllocation,
  assignOrder,
  updateAssignment,
  removeAssignment
};
