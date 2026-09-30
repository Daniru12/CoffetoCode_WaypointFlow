const Order = require('../orders/order.model');
const Delivery = require('../deliveries/delivery.model');
const Receipt = require('../receipts/receipt.model');
const Issue = require('../issues/issue.model');
const Outlet = require('../outlets/outlet.model');
const ApiResponse = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');

/**
 * Store Manager Dashboard metrics and active tasks
 * GET /api/v1/store/dashboard
 */
const getStoreDashboard = asyncHandler(async (req, res) => {
  const user = req.user;
  let outlet = null;

  if (user.outlet) {
    outlet = await Outlet.findById(user.outlet);
  }

  const outletFilter = outlet ? { outlet: outlet._id } : { createdBy: user._id };

  const [totalOrders, pendingDeliveries, completedReceipts, reportedIssues] = await Promise.all([
    Order.countDocuments(outletFilter),
    Delivery.countDocuments({
      ...(outlet ? { outlet: outlet._id } : {}),
      status: { $in: ['PENDING', 'ARRIVED'] }
    }),
    Receipt.countDocuments(outletFilter),
    Issue.countDocuments({
      ...(outlet ? { outlet: outlet._id } : {}),
      status: 'OPEN'
    })
  ]);

  const recentOrders = await Order.find(outletFilter)
    .sort({ createdAt: -1 })
    .limit(10)
    .populate('outlet');

  const incomingDeliveries = await Delivery.find({
    ...(outlet ? { outlet: outlet._id } : {}),
    status: { $in: ['PENDING', 'ARRIVED'] }
  })
    .populate('order driver trip')
    .sort({ plannedArrival: 1 });

  res.status(200).json(
    new ApiResponse(200, {
      outlet,
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

module.exports = {
  getStoreDashboard
};
