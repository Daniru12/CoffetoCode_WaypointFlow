const Order = require('./order.model');
const Outlet = require('../outlets/outlet.model');
const Delivery = require('../deliveries/delivery.model');
const Trip = require('../trips/trip.model');
const DriverLocation = require('../tracking/driverLocation.model');
const ApiResponse = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const socketService = require('../../services/socket.service');
const auditService = require('../../services/audit.service');
const { getColomboTimeParts } = require('../../utils/time.util');

/**
 * Place a new store order
 * POST /api/v1/orders
 */
const createOrder = asyncHandler(async (req, res) => {
  const {
    outletId,
    requestedDeliveryDate,
    tempRequirement = 'ambient',
    items = [],
    orderUnits,
    orderWeightKg,
    orderVolumeM3,
    deliveryWindow
  } = req.body;

  // 1. Identify outlet
  let outlet;
  if (outletId) {
    outlet = await Outlet.findOne({
      $or: [{ outletId }, ...(outletId.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: outletId }] : [])]
    });
  } else if (req.user.role === 'STORE_MANAGER' && req.user.outlet) {
    outlet = await Outlet.findById(req.user.outlet);
  }

  if (!outlet) {
    return res.status(400).json(new ApiResponse(400, null, 'Valid outlet must be specified'));
  }

  // 2. Validate temperature requirement rule (Style & Tech can ONLY be ambient)
  if (outlet.brand !== 'Fresh' && tempRequirement === 'chilled') {
    return res.status(400).json(
      new ApiResponse(400, null, `Brand '${outlet.brand}' cannot place chilled orders. Only Fresh supports chilled.`)
    );
  }

  // 3. Cutoff enforcement (16:00 Colombo time for next-day delivery)
  const { getEffectiveTime, getColomboTimeParts, isCutoffPassed, getNextSuggestedRun } = require('../../utils/time.util');
  const effectiveNow = getEffectiveTime();
  const colombo = getColomboTimeParts(effectiveNow);
  const deliveryDate = new Date(requestedDeliveryDate);
  const tomorrow = getNextSuggestedRun(effectiveNow);

  const isTargetTomorrow = deliveryDate.toISOString().slice(0, 10) === tomorrow.toISOString().slice(0, 10);
  const cutoffPassed = isCutoffPassed(effectiveNow);

  let status = 'CONFIRMED';
  let isPostCutoff = false;
  let dispatchCycle = 'CURRENT_CYCLE';
  let scheduledDispatchDate = deliveryDate;
  let cutoffNotice = null;

  if (isTargetTomorrow && cutoffPassed) {
    isPostCutoff = true;
    dispatchCycle = 'NEXT_CYCLE';
    scheduledDispatchDate = getNextSuggestedRun(tomorrow);
    cutoffNotice = `Order placed after 16:00 Colombo cutoff (${colombo.timeString}). Queued for subsequent delivery cycle (${scheduledDispatchDate.toISOString().slice(0, 10)}).`;
  }

  // Calculate default weight/volume if items are given
  let calculatedWeight = Number(orderWeightKg) || 0;
  let calculatedVolume = Number(orderVolumeM3) || 0;
  let calculatedUnits = Number(orderUnits) || 0;

  if (items && items.length > 0) {
    calculatedUnits = items.reduce((acc, it) => acc + (Number(it.qty) || 0), 0) || calculatedUnits;
    calculatedWeight = items.reduce((acc, it) => acc + (Number(it.weightKg) || 0), 0) || calculatedWeight;
    calculatedVolume = items.reduce((acc, it) => acc + (Number(it.volumeM3) || 0), 0) || calculatedVolume;
  }

  if (!calculatedUnits) calculatedUnits = 1;

  // Deduct from Store Manager inventory if placed by a Store Manager
  if (req.user && req.user.role === 'STORE_MANAGER' && items && items.length > 0) {
    const StoreManagerInventory = require('../inventory/storeManagerInventory.model');
    for (const it of items) {
      if (it.itemName && it.qty) {
        await StoreManagerInventory.findOneAndUpdate(
          { storeManager: req.user._id, itemName: it.itemName },
          { $inc: { quantity: -Number(it.qty) } }
        );
      }
    }
  }

  // 4. Generate unique order reference
  const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
  const orderRef = `ORD-${outlet.outletId}-${Date.now().toString().slice(-6)}-${randomSuffix}`;

  const order = await Order.create({
    orderRef,
    outlet: outlet._id,
    requestedDeliveryDate: isPostCutoff ? scheduledDispatchDate : deliveryDate,
    brand: outlet.brand,
    tempRequirement,
    items: items && items.length > 0 ? items : [{ itemName: 'Standard Cargo', qty: calculatedUnits, weightKg: calculatedWeight, volumeM3: calculatedVolume }],
    orderUnits: calculatedUnits,
    orderWeightKg: calculatedWeight,
    orderVolumeM3: calculatedVolume,
    deliveryWindow: deliveryWindow || {
      start: outlet.windowOpenTime || '06:00',
      end: outlet.windowCloseTime || '08:00'
    },
    status,
    createdBy: req.user._id,
    submittedAt: effectiveNow,
    orderSource: req.body.orderSource || 'MANUAL',
    replenishmentPlan: req.body.replenishmentPlan || undefined,
    isPostCutoff,
    dispatchCycle,
    scheduledDispatchDate
  });

  const populatedOrder = await Order.findById(order._id).populate('outlet createdBy', '-password');

  // Emit realtime event
  socketService.emitOrderCreated(populatedOrder);

  // Log audit
  await auditService.log({
    user: req.user,
    action: 'ORDER_CREATED',
    entityType: 'Order',
    entityId: order._id,
    newData: populatedOrder
  });

  res.status(201).json(
    new ApiResponse(
      201,
      { order: populatedOrder, notice: cutoffNotice },
      'Order placed successfully'
    )
  );
});

/**
 * Get orders with filters
 * GET /api/v1/orders
 */
const getOrders = asyncHandler(async (req, res) => {
  const { date, status, brand, outletId, depot } = req.query;
  const filter = {};

  if (req.user.role === 'STORE_MANAGER' && req.user.outlet) {
    filter.outlet = req.user.outlet;
  } else if (outletId) {
    const outletDoc = await Outlet.findOne({
      $or: [{ outletId }, ...(outletId.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: outletId }] : [])]
    });
    if (outletDoc) filter.outlet = outletDoc._id;
  }

  if (status) filter.status = status;
  if (brand) filter.brand = brand;
  if (date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    filter.requestedDeliveryDate = { $gte: start, $lte: end };
  }

  let query = Order.find(filter).populate('outlet createdBy', '-password');

  if (depot) {
    // filter by outlet depot
    const depotOutlets = await Outlet.find({ depot }).select('_id');
    const outletIds = depotOutlets.map(o => o._id);
    filter.outlet = { $in: outletIds };
  }

  const orders = await Order.find(filter)
    .populate('outlet createdBy', '-password')
    .sort({ requestedDeliveryDate: -1, createdAt: -1 });

  res.status(200).json(new ApiResponse(200, orders, `Retrieved ${orders.length} orders`));
});

/**
 * Get current store manager's orders
 * GET /api/v1/orders/my
 */
const getMyOrders = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.user.outlet) {
    filter.outlet = req.user.outlet;
  } else {
    filter.createdBy = req.user._id;
  }

  const orders = await Order.find(filter)
    .populate('outlet createdBy', '-password')
    .sort({ createdAt: -1 });

  res.status(200).json(new ApiResponse(200, orders, `Retrieved ${orders.length} store orders`));
});

/**
 * Dispatcher Order Queue
 * GET /api/v1/orders/queue
 * Filters: brand, district, depot, temperature, deliveryWindow, status, deferred
 */
const getOrderQueue = asyncHandler(async (req, res) => {
  const { brand, district, depot, temperature, deliveryWindow, status, deferred, orderSource, dispatchCycle } = req.query;

  const filter = {};

  if (status) {
    filter.status = status;
  } else {
    // Default queue shows unserved or active planning states
    filter.status = { $in: ['CONFIRMED', 'PLANNING', 'DEFERRED'] };
  }

  if (brand) filter.brand = brand;
  if (temperature) filter.tempRequirement = temperature;
  if (orderSource) filter.orderSource = orderSource;
  if (dispatchCycle) filter.dispatchCycle = dispatchCycle;
  if (deferred === 'true') {
    filter.deferredCount = { $gt: 0 };
  }

  let orders = await Order.find(filter)
    .populate('outlet createdBy', '-password')
    .sort({ deferredCount: -1, requestedDeliveryDate: 1, createdAt: 1 });

  // Post-filter by outlet properties if needed (depot, district)
  if (depot || district || deliveryWindow) {
    orders = orders.filter(o => {
      if (!o.outlet) return false;
      if (depot && o.outlet.depot !== depot) return false;
      if (district && o.outlet.district !== district) return false;
      if (deliveryWindow && o.deliveryWindow && o.deliveryWindow.start !== deliveryWindow) return false;
      return true;
    });
  }

  res.status(200).json(new ApiResponse(200, orders, `Dispatcher queue: ${orders.length} orders`));
});

/**
 * Get order by ID or orderRef
 * GET /api/v1/orders/:id
 */
const getOrderById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const order = await Order.findOne({
    $or: [{ orderRef: id }, ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : [])]
  }).populate('outlet createdBy', '-password');

  if (!order) {
    return res.status(404).json(new ApiResponse(404, null, `Order '${id}' not found`));
  }

  // If Store Manager, ensure ownership
  if (
    req.user.role === 'STORE_MANAGER' &&
    req.user.outlet &&
    order.outlet._id.toString() !== req.user.outlet.toString()
  ) {
    return res.status(403).json(new ApiResponse(403, null, 'Access denied to other outlet orders'));
  }

  res.status(200).json(new ApiResponse(200, order, 'Order retrieved'));
});

/**
 * Update order
 * PATCH /api/v1/orders/:id
 */
const updateOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const order = await Order.findOne({
    $or: [{ orderRef: id }, ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : [])]
  });

  if (!order) {
    return res.status(404).json(new ApiResponse(404, null, `Order '${id}' not found`));
  }

  // Only DRAFT or CONFIRMED orders can be modified by store manager
  if (req.user.role === 'STORE_MANAGER' && !['DRAFT', 'CONFIRMED'].includes(order.status)) {
    return res.status(400).json(
      new ApiResponse(400, null, `Cannot edit order in '${order.status}' status`)
    );
  }

  const prevData = order.toObject();
  const allowedUpdates = ['items', 'orderUnits', 'orderWeightKg', 'orderVolumeM3', 'tempRequirement', 'status', 'deliveryWindow'];
  allowedUpdates.forEach(key => {
    if (req.body[key] !== undefined) {
      order[key] = req.body[key];
    }
  });

  await order.save();
  const updatedOrder = await Order.findById(order._id).populate('outlet createdBy', '-password');

  await auditService.log({
    user: req.user,
    action: 'ORDER_UPDATED',
    entityType: 'Order',
    entityId: order._id,
    previousData: prevData,
    newData: updatedOrder
  });

  res.status(200).json(new ApiResponse(200, updatedOrder, 'Order updated successfully'));
});

/**
 * Delete order
 * DELETE /api/v1/orders/:id
 */
const deleteOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const order = await Order.findOne({
    $or: [{ orderRef: id }, ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : [])]
  });

  if (!order) {
    return res.status(404).json(new ApiResponse(404, null, `Order '${id}' not found`));
  }

  if (['LOADING', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(order.status)) {
    return res.status(400).json(
      new ApiResponse(400, null, `Cannot delete order currently in '${order.status}'`)
    );
  }

  await Order.findByIdAndDelete(order._id);

  await auditService.log({
    user: req.user,
    action: 'ORDER_DELETED',
    entityType: 'Order',
    entityId: order._id,
    previousData: order
  });

  res.status(200).json(new ApiResponse(200, null, 'Order deleted successfully'));
});

/**
 * Get live tracking information for an order
 * GET /api/v1/orders/:id/tracking
 */
const getOrderTracking = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const order = await Order.findOne({
    $or: [{ orderRef: id }, ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : [])]
  }).populate('outlet');

  if (!order) {
    return res.status(404).json(new ApiResponse(404, null, 'Order not found'));
  }

  // Find corresponding delivery and trip
  const delivery = await Delivery.findOne({ order: order._id }).populate('trip driver');
  let trip = null;
  let driverLocation = null;

  if (delivery && delivery.trip) {
    trip = await Trip.findById(delivery.trip).populate('vehicle driver');
    if (delivery.driver) {
      driverLocation = await DriverLocation.findOne({ driver: delivery.driver._id }).sort({ recordedAt: -1 });
    }
  }

  res.status(200).json(
    new ApiResponse(200, {
      order,
      delivery,
      trip,
      driverLocation,
      currentStatus: order.status,
      estimatedArrival: order.estimatedArrival
    }, 'Tracking details retrieved')
  );
});

module.exports = {
  createOrder,
  getOrders,
  getMyOrders,
  getOrderQueue,
  getOrderById,
  updateOrder,
  deleteOrder,
  getOrderTracking
};
