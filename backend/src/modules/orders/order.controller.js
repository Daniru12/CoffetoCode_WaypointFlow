const Order = require('./order.model');
const Outlet = require('../outlets/outlet.model');
const ApiResponse = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');

/**
 * Helper to get current hour & minute in Asia/Colombo (UTC+5:30)
 */
const getColomboCurrentTime = () => {
  const now = new Date();
  // Colombo is UTC + 5.5 hours
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const colomboTime = new Date(utc + (3600000 * 5.5));
  return {
    hours: colomboTime.getHours(),
    minutes: colomboTime.getMinutes(),
    dateString: colomboTime.toISOString().slice(0, 10)
  };
};

/**
 * Place a new store order
 * POST /api/v1/orders
 */
const createOrder = asyncHandler(async (req, res) => {
  const {
    outletId,
    requestedDeliveryDate,
    tempRequirement = 'ambient',
    orderUnits,
    orderWeightKg,
    orderVolumeM3
  } = req.body;

  // 1. Identify outlet
  let outlet;
  if (req.user.role === 'STORE_MANAGER' && req.user.outlet) {
    outlet = await Outlet.findById(req.user.outlet);
  } else if (outletId) {
    outlet = await Outlet.findOne({
      $or: [{ outletId }, ...(outletId.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: outletId }] : [])]
    });
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
  const colombo = getColomboCurrentTime();
  const deliveryDate = new Date(requestedDeliveryDate);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const isNextDay = deliveryDate.toISOString().slice(0, 10) === tomorrow.toISOString().slice(0, 10);
  let status = 'CONFIRMED';
  let cutoffNotice = null;

  if (isNextDay && (colombo.hours > 16 || (colombo.hours === 16 && colombo.minutes > 0))) {
    cutoffNotice = 'Order placed after 16:00 cutoff. Automatically queued for subsequent delivery cycle.';
  }

  // 4. Generate unique order reference
  const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
  const orderRef = `ORD-${outlet.outletId}-${Date.now().toString().slice(-6)}-${randomSuffix}`;

  const order = await Order.create({
    orderRef,
    outlet: outlet._id,
    requestedDeliveryDate: deliveryDate,
    brand: outlet.brand,
    tempRequirement,
    orderUnits: Number(orderUnits) || 1,
    orderWeightKg: Number(orderWeightKg) || 0,
    orderVolumeM3: Number(orderVolumeM3) || 0,
    status,
    createdBy: req.user._id
  });

  const populatedOrder = await Order.findById(order._id).populate('outlet');

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
  const { date, status, brand, outletId } = req.query;
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

  const orders = await Order.find(filter)
    .populate('outlet')
    .sort({ requestedDeliveryDate: -1, createdAt: -1 });

  res.status(200).json(new ApiResponse(200, orders, `Retrieved ${orders.length} orders`));
});

/**
 * Get order by ID or orderRef
 * GET /api/v1/orders/:id
 */
const getOrderById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const order = await Order.findOne({
    $or: [{ orderRef: id }, ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : [])]
  }).populate('outlet');

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

module.exports = {
  createOrder,
  getOrders,
  getOrderById
};
