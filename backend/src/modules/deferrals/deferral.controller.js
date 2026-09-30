const Deferral = require('./deferral.model');
const Order = require('../orders/order.model');
const DeliveryPlan = require('../planning/deliveryPlan.model');
const ApiResponse = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const socketService = require('../../services/socket.service');
const auditService = require('../../services/audit.service');
const { getNextSuggestedRun } = require('../../utils/time.util');

/**
 * List all deferrals with filters
 * GET /api/v1/deferrals
 */
const getDeferrals = asyncHandler(async (req, res) => {
  const { reasonCode, resolved } = req.query;
  const filter = {};
  if (reasonCode) filter.reasonCode = reasonCode;
  if (resolved === 'true') filter.resolvedAt = { $ne: null };
  if (resolved === 'false') filter.resolvedAt = null;

  const deferrals = await Deferral.find(filter)
    .populate({
      path: 'order',
      populate: { path: 'outlet' }
    })
    .populate('plan deferredBy', 'name email')
    .sort({ deferredAt: -1 });

  res.status(200).json(new ApiResponse(200, deferrals, `Retrieved ${deferrals.length} deferrals`));
});

/**
 * Get deferral by ID
 * GET /api/v1/deferrals/:id
 */
const getDeferralById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const deferral = await Deferral.findById(id)
    .populate({
      path: 'order',
      populate: { path: 'outlet' }
    })
    .populate('plan deferredBy', 'name email');

  if (!deferral) {
    return res.status(404).json(new ApiResponse(404, null, 'Deferral not found'));
  }

  res.status(200).json(new ApiResponse(200, deferral, 'Deferral retrieved'));
});

/**
 * Defer an order with reason code and explanation
 * POST /api/v1/orders/:orderId/defer
 */
const deferOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { planId, reasonCode, reason, nextSuggestedRun } = req.body;

  if (!reasonCode || !reason) {
    return res.status(400).json(new ApiResponse(400, null, 'reasonCode and reason are required'));
  }

  const order = await Order.findOne({
    $or: [{ orderRef: orderId }, ...(orderId.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: orderId }] : [])]
  }).populate('outlet');

  if (!order) {
    return res.status(404).json(new ApiResponse(404, null, 'Order not found'));
  }

  const previousCount = order.deferredCount || 0;
  order.status = 'DEFERRED';
  order.deferredCount = previousCount + 1;
  order.lastDeferredAt = new Date();
  await order.save();

  const suggestedRun = nextSuggestedRun ? new Date(nextSuggestedRun) : getNextSuggestedRun(order.requestedDeliveryDate);

  const deferral = await Deferral.create({
    order: order._id,
    plan: planId || null,
    reasonCode,
    reason,
    deferredBy: req.user._id,
    deferredAt: new Date(),
    nextSuggestedRun: suggestedRun,
    previousDeferralCount: previousCount
  });

  // If associated with a plan, add to deferredOrders
  if (planId) {
    await DeliveryPlan.findByIdAndUpdate(planId, {
      $addToSet: { deferredOrders: order._id },
      $pull: { servedOrders: order._id }
    });
  }

  // Realtime & Audit
  socketService.emitOrderDeferred(deferral);
  await auditService.log({
    user: req.user,
    action: 'ORDER_DEFERRED',
    entityType: 'Order',
    entityId: order._id,
    reason: `[${reasonCode}] ${reason}`,
    newData: deferral
  });

  res.status(201).json(new ApiResponse(201, { deferral, order }, 'Order deferred successfully'));
});

/**
 * Reconsider a deferred order (move back into planning)
 * POST /api/v1/deferrals/:id/reconsider
 */
const reconsiderDeferral = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const deferral = await Deferral.findById(id);

  if (!deferral) {
    return res.status(404).json(new ApiResponse(404, null, 'Deferral not found'));
  }

  const order = await Order.findById(deferral.order);
  if (order) {
    order.status = 'PLANNING';
    await order.save();
  }

  deferral.resolvedAt = new Date();
  await deferral.save();

  res.status(200).json(new ApiResponse(200, { deferral, order }, 'Order moved back to planning'));
});

/**
 * Resolve a deferral
 * POST /api/v1/deferrals/:id/resolve
 */
const resolveDeferral = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const deferral = await Deferral.findById(id);

  if (!deferral) {
    return res.status(404).json(new ApiResponse(404, null, 'Deferral not found'));
  }

  deferral.resolvedAt = new Date();
  await deferral.save();

  res.status(200).json(new ApiResponse(200, deferral, 'Deferral resolved'));
});

module.exports = {
  getDeferrals,
  getDeferralById,
  deferOrder,
  reconsiderDeferral,
  resolveDeferral
};
