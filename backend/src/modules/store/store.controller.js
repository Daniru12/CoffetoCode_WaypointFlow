const Order = require('../orders/order.model');
const Delivery = require('../deliveries/delivery.model');
const Receipt = require('../receipts/receipt.model');
const Issue = require('../issues/issue.model');
const Outlet = require('../outlets/outlet.model');
const ReplenishmentPlan = require('./replenishmentPlan.model');
const ApiResponse = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');

/**
 * Get all outlets assigned to the logged-in Store Manager
 * GET /api/v1/store/my-outlets
 */
const getMyOutlets = asyncHandler(async (req, res) => {
  const user = req.user;

  // Primary: outlets where assignedManager matches this user
  const assignedOutlets = await Outlet.find({ assignedManager: user._id }).sort({ outletId: 1 });

  // Fallback: if user still has legacy outlet ObjectId set, include that too
  let mergedOutlets = assignedOutlets;
  if (user.outlet && assignedOutlets.length === 0) {
    const legacyOutlet = await Outlet.findById(user.outlet);
    if (legacyOutlet) mergedOutlets = [legacyOutlet];
  }

  res.status(200).json(new ApiResponse(200, mergedOutlets, `${mergedOutlets.length} outlet(s) assigned to you`));
});

/**
 * Store Manager Dashboard metrics for a specific outlet
 * GET /api/v1/store/dashboard?outletId=<outletObjectId>
 */
const getStoreDashboard = asyncHandler(async (req, res) => {
  const user = req.user;
  const { outletId } = req.query;

  let assignedOutlets = await Outlet.find({ assignedManager: user._id }).sort({ outletId: 1 });

  if (assignedOutlets.length === 0 && user.outlet) {
    const legacyOutlet = await Outlet.findById(user.outlet);
    if (legacyOutlet) assignedOutlets = [legacyOutlet];
  }

  let activeOutlet = null;
  if (outletId) {
    activeOutlet = assignedOutlets.find(o => o._id.toString() === outletId);
    if (!activeOutlet) {
      return res.status(403).json(new ApiResponse(403, null, 'You do not have access to this outlet'));
    }
  } else if (assignedOutlets.length === 1) {
    activeOutlet = assignedOutlets[0];
  }

  const outletFilter = activeOutlet
    ? { outlet: activeOutlet._id }
    : assignedOutlets.length > 0
      ? { outlet: { $in: assignedOutlets.map(o => o._id) } }
      : { createdBy: user._id };

  const deliveryFilter = activeOutlet
    ? { outlet: activeOutlet._id, status: { $in: ['PENDING', 'ARRIVED'] } }
    : assignedOutlets.length > 0
      ? { outlet: { $in: assignedOutlets.map(o => o._id) }, status: { $in: ['PENDING', 'ARRIVED'] } }
      : { status: { $in: ['PENDING', 'ARRIVED'] } };

  const issueFilter = activeOutlet
    ? { outlet: activeOutlet._id, status: 'OPEN' }
    : assignedOutlets.length > 0
      ? { outlet: { $in: assignedOutlets.map(o => o._id) }, status: 'OPEN' }
      : { status: 'OPEN' };

  const [totalOrders, pendingDeliveries, completedReceipts, reportedIssues] = await Promise.all([
    Order.countDocuments(outletFilter),
    Delivery.countDocuments(deliveryFilter),
    Receipt.countDocuments(outletFilter),
    Issue.countDocuments(issueFilter)
  ]);

  const recentOrders = await Order.find(outletFilter)
    .sort({ createdAt: -1 })
    .limit(10)
    .populate('outlet');

  const incomingDeliveries = await Delivery.find(deliveryFilter)
    .populate('order driver trip')
    .sort({ plannedArrival: 1 });

  res.status(200).json(
    new ApiResponse(200, {
      outlet: activeOutlet,
      assignedOutlets,
      metrics: {
        totalOrders,
        pendingDeliveries,
        completedReceipts,
        reportedIssues
      },
      incomingDeliveries,
      recentOrders
    }, 'Store Manager dashboard loaded')
  );
});

/**
 * Get all replenishment plans for the logged-in Store Manager
 * GET /api/v1/store/replenishment-plans
 */
const getReplenishmentPlans = asyncHandler(async (req, res) => {
  const plans = await ReplenishmentPlan.find({ storeManager: req.user._id }).populate('outlets');
  res.status(200).json(new ApiResponse(200, plans, 'Replenishment plans retrieved'));
});

/**
 * Create a new replenishment plan
 * POST /api/v1/store/replenishment-plans
 */
const createReplenishmentPlan = asyncHandler(async (req, res) => {
  const planData = { ...req.body, storeManager: req.user._id };
  const plan = await ReplenishmentPlan.create(planData);
  res.status(201).json(new ApiResponse(201, plan, 'Replenishment plan created successfully'));
});

/**
 * Update a replenishment plan
 * PUT /api/v1/store/replenishment-plans/:id
 */
const updateReplenishmentPlan = asyncHandler(async (req, res) => {
  const plan = await ReplenishmentPlan.findOneAndUpdate(
    { _id: req.params.id, storeManager: req.user._id },
    req.body,
    { new: true }
  );
  if (!plan) return res.status(404).json(new ApiResponse(404, null, 'Plan not found'));
  res.status(200).json(new ApiResponse(200, plan, 'Replenishment plan updated'));
});

/**
 * Delete a replenishment plan
 * DELETE /api/v1/store/replenishment-plans/:id
 */
const deleteReplenishmentPlan = asyncHandler(async (req, res) => {
  const plan = await ReplenishmentPlan.findOneAndDelete({ _id: req.params.id, storeManager: req.user._id });
  if (!plan) return res.status(404).json(new ApiResponse(404, null, 'Plan not found'));
  res.status(200).json(new ApiResponse(200, null, 'Replenishment plan deleted'));
});

module.exports = {
  getMyOutlets,
  getStoreDashboard,
  getReplenishmentPlans,
  createReplenishmentPlan,
  updateReplenishmentPlan,
  deleteReplenishmentPlan
};
