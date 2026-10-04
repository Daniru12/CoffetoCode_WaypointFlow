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
  
  if (planData.status === 'ACTIVE') {
    const StoreManagerInventory = require('../inventory/storeManagerInventory.model');
    // Validate and deduct stock
    const outletCount = planData.outlets ? planData.outlets.length : 1;
    
    // First pass: validation
    for (const item of planData.items) {
      const totalRequired = item.qty * outletCount;
      const storeItem = await StoreManagerInventory.findOne({ 
        storeManager: req.user._id, 
        itemName: item.itemName // Use itemName as it matches the frontend logic, or itemCode if available
      });
      
      if (!storeItem || storeItem.quantity < totalRequired) {
        return res.status(400).json(new ApiResponse(400, null, `Insufficient stock in your inventory for item: ${item.itemName}`));
      }
    }
    
    // Second pass: deduction
    for (const item of planData.items) {
      const totalRequired = item.qty * outletCount;
      await StoreManagerInventory.findOneAndUpdate(
        { storeManager: req.user._id, itemName: item.itemName },
        { $inc: { quantity: -totalRequired } }
      );
    }
  }

  const plan = await ReplenishmentPlan.create(planData);
  res.status(201).json(new ApiResponse(201, plan, 'Replenishment plan created successfully'));
});

/**
 * Update a replenishment plan
 * PUT /api/v1/store/replenishment-plans/:id
 */
const updateReplenishmentPlan = asyncHandler(async (req, res) => {
  const existingPlan = await ReplenishmentPlan.findOne({ _id: req.params.id, storeManager: req.user._id });
  if (!existingPlan) return res.status(404).json(new ApiResponse(404, null, 'Plan not found'));

  const newStatus = req.body.status || existingPlan.status;
  
  // If transitioning to ACTIVE, deduct stock
  if (existingPlan.status !== 'ACTIVE' && newStatus === 'ACTIVE') {
    const StoreManagerInventory = require('../inventory/storeManagerInventory.model');
    const items = req.body.items || existingPlan.items;
    const outlets = req.body.outlets || existingPlan.outlets;
    const outletCount = outlets ? outlets.length : 1;

    // First pass: validation
    for (const item of items) {
      const totalRequired = item.qty * outletCount;
      const storeItem = await StoreManagerInventory.findOne({ 
        storeManager: req.user._id, 
        itemName: item.itemName 
      });
      
      if (!storeItem || storeItem.quantity < totalRequired) {
        return res.status(400).json(new ApiResponse(400, null, `Insufficient stock in your inventory for item: ${item.itemName}`));
      }
    }
    
    // Second pass: deduction
    for (const item of items) {
      const totalRequired = item.qty * outletCount;
      await StoreManagerInventory.findOneAndUpdate(
        { storeManager: req.user._id, itemName: item.itemName },
        { $inc: { quantity: -totalRequired } }
      );
    }
  }

  const plan = await ReplenishmentPlan.findOneAndUpdate(
    { _id: req.params.id, storeManager: req.user._id },
    req.body,
    { new: true }
  );
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

/**
 * Generate actual retail orders from an active Replenishment Plan
 * POST /api/v1/store/replenishment-plans/:id/generate-orders
 */
const generateOrdersFromPlan = asyncHandler(async (req, res) => {
  const plan = await ReplenishmentPlan.findOne({ _id: req.params.id, storeManager: req.user._id }).populate('outlets');
  if (!plan) return res.status(404).json(new ApiResponse(404, null, 'Replenishment plan not found'));

  const { targetDate } = req.body;
  const timeUtil = require('../../utils/time.util');
  const socketService = require('../../services/socket.service');
  const auditService = require('../../services/audit.service');
  const effectiveNow = timeUtil.getEffectiveTime();
  const deliveryDate = targetDate ? new Date(targetDate) : timeUtil.getNextSuggestedRun(effectiveNow);

  // Check 16:00 cutoff
  const tomorrow = timeUtil.getNextSuggestedRun(effectiveNow);
  const isTargetTomorrow = deliveryDate.toISOString().slice(0, 10) === tomorrow.toISOString().slice(0, 10);
  const cutoffPassed = timeUtil.isCutoffPassed(effectiveNow);

  let isPostCutoff = false;
  let dispatchCycle = 'CURRENT_CYCLE';
  let finalDeliveryDate = deliveryDate;

  if (isTargetTomorrow && cutoffPassed) {
    isPostCutoff = true;
    dispatchCycle = 'NEXT_CYCLE';
    finalDeliveryDate = timeUtil.getNextSuggestedRun(tomorrow);
  }

  const Order = require('../orders/order.model');
  const StoreManagerInventory = require('../inventory/storeManagerInventory.model');

  // Calculate order weight & volume per outlet from items
  const items = plan.items || [];
  let calculatedUnits = 0;
  let calculatedWeight = 0;
  let calculatedVolume = 0;

  for (const it of items) {
    const qty = Number(it.qty) || 1;
    calculatedUnits += qty;
    const wt = it.weightKg || (qty * 2.5);
    const vol = it.volumeM3 || (qty * 0.015);
    calculatedWeight += wt;
    calculatedVolume += vol;
  }

  if (calculatedUnits === 0) calculatedUnits = 1;

  const generatedOrders = [];
  const outlets = plan.outlets || [];

  for (const outlet of outlets) {
    // Avoid creating duplicate orders for same plan, outlet, and date
    const existing = await Order.findOne({
      outlet: outlet._id,
      replenishmentPlan: plan._id,
      requestedDeliveryDate: {
        $gte: new Date(new Date(finalDeliveryDate).setHours(0, 0, 0, 0)),
        $lte: new Date(new Date(finalDeliveryDate).setHours(23, 59, 59, 999))
      }
    });

    if (existing) continue;

    const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
    const orderRef = `ORD-RP-${outlet.outletId || 'OUT'}-${Date.now().toString().slice(-6)}-${randomSuffix}`;

    const newOrder = await Order.create({
      orderRef,
      outlet: outlet._id,
      brand: outlet.brand || plan.brand || 'Fresh',
      requestedDeliveryDate: finalDeliveryDate,
      tempRequirement: plan.cargoType === 'chilled' ? 'chilled' : 'ambient',
      items: items.map(it => ({
        itemName: it.itemName,
        qty: it.qty,
        unit: it.unit || 'cases',
        weightKg: it.weightKg || ((Number(it.qty) || 1) * 2.5),
        volumeM3: it.volumeM3 || ((Number(it.qty) || 1) * 0.015)
      })),
      orderUnits: calculatedUnits,
      orderWeightKg: calculatedWeight,
      orderVolumeM3: calculatedVolume,
      deliveryWindow: {
        start: outlet.windowOpenTime || (outlet.brand === 'Fresh' ? '06:00' : '09:00'),
        end: outlet.windowCloseTime || (outlet.brand === 'Fresh' ? '08:00' : '17:00')
      },
      status: 'CONFIRMED',
      createdBy: req.user._id,
      submittedAt: effectiveNow,
      orderSource: 'REPLENISHMENT_PLAN',
      replenishmentPlan: plan._id,
      isPostCutoff,
      dispatchCycle,
      scheduledDispatchDate: finalDeliveryDate
    });

    const populated = await Order.findById(newOrder._id).populate('outlet createdBy', '-password');
    generatedOrders.push(populated);
    socketService.emitOrderCreated(populated);
  }

  // Deduct from Store Manager inventory for generated orders
  for (const it of items) {
    const totalDeduct = (Number(it.qty) || 1) * generatedOrders.length;
    if (totalDeduct > 0) {
      await StoreManagerInventory.findOneAndUpdate(
        { storeManager: req.user._id, itemName: it.itemName },
        { $inc: { quantity: -totalDeduct } }
      );
    }
  }

  await auditService.log({
    user: req.user,
    action: 'OTHER',
    entityType: 'ReplenishmentPlan',
    entityId: plan._id,
    newData: {
      generatedCount: generatedOrders.length,
      targetDate: finalDeliveryDate,
      isPostCutoff
    },
    reason: `Generated ${generatedOrders.length} retail orders from replenishment plan ${plan.planName}`
  });

  res.status(201).json(new ApiResponse(201, {
    generatedCount: generatedOrders.length,
    orders: generatedOrders,
    targetDate: finalDeliveryDate,
    isPostCutoff,
    dispatchCycle
  }, `Successfully generated ${generatedOrders.length} retail orders for ${finalDeliveryDate.toISOString().slice(0, 10)}`));
});

module.exports = {
  getMyOutlets,
  getStoreDashboard,
  getReplenishmentPlans,
  createReplenishmentPlan,
  updateReplenishmentPlan,
  deleteReplenishmentPlan,
  generateOrdersFromPlan
};

