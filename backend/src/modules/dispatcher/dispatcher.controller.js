const Order = require('../orders/order.model');
const Vehicle = require('../vehicles/vehicle.model');
const Trip = require('../trips/trip.model');
const DeliveryPlan = require('../planning/deliveryPlan.model');
const Issue = require('../issues/issue.model');
const Deferral = require('../deferrals/deferral.model');
const LoadingJob = require('../loading/loadingJob.model');
const ApiResponse = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');

/**
 * Dispatcher dashboard overview
 * GET /api/v1/dispatcher/dashboard
 */
const getDispatcherDashboard = asyncHandler(async (req, res) => {
  const { depot } = req.query;
  const vehicleFilter = depot ? { depot } : {};

  const [
    totalOrdersInQueue,
    deferredOrdersCount,
    availableVehiclesCount,
    activeTripsCount,
    activePlansCount,
    criticalIssuesCount
  ] = await Promise.all([
    Order.countDocuments({ status: { $in: ['CONFIRMED', 'PLANNING'] } }),
    Order.countDocuments({ status: 'DEFERRED' }),
    Vehicle.countDocuments({ ...vehicleFilter, status: 'AVAILABLE' }),
    Trip.countDocuments({ status: { $in: ['IN_PROGRESS', 'IN_TRANSIT', 'LOADING'] } }),
    DeliveryPlan.countDocuments({ status: { $in: ['READY', 'PUBLISHED'] } }),
    Issue.countDocuments({ severity: 'CRITICAL', status: { $ne: 'RESOLVED' } })
  ]);

  const vehiclesByStatus = await Vehicle.aggregate([
    ...(depot ? [{ $match: { depot } }] : []),
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);

  const activePlans = await DeliveryPlan.find()
    .sort({ deliveryDate: -1 })
    .limit(5)
    .populate('servedOrders deferredOrders createdBy', 'name email');

  res.status(200).json(
    new ApiResponse(200, {
      metrics: {
        totalOrdersInQueue,
        deferredOrdersCount,
        availableVehiclesCount,
        activeTripsCount,
        activePlansCount,
        criticalIssuesCount
      },
      vehiclesByStatus,
      activePlans
    }, 'Dispatcher dashboard retrieved')
  );
});

/**
 * Dispatcher operational alerts (shortfalls, breakdowns, late deliveries)
 * GET /api/v1/dispatcher/alerts
 */
const getDispatcherAlerts = asyncHandler(async (req, res) => {
  const alerts = [];

  // 1. Loading shortfalls
  const shortfallJobs = await LoadingJob.find({ status: { $in: ['SHORTFALL', 'WAITING_FOR_DECISION'] } })
    .populate('trip vehicle loader');
  shortfallJobs.forEach(job => {
    alerts.push({
      type: 'LOADING_SHORTFALL',
      severity: 'HIGH',
      title: `Loading Shortfall on Job ${job.loadingJobRef}`,
      message: `Vehicle ${job.vehicle?.vehicleId} has loading discrepancies requiring dispatcher decision.`,
      entityId: job._id,
      timestamp: job.updatedAt
    });
  });

  // 2. Open critical issues / breakdowns
  const openIssues = await Issue.find({ status: { $in: ['OPEN', 'INVESTIGATING'] } })
    .populate('vehicle order trip reportedBy');
  openIssues.forEach(issue => {
    alerts.push({
      type: issue.type,
      severity: issue.severity,
      title: `Issue Reported: ${issue.type}`,
      message: issue.description,
      entityId: issue._id,
      timestamp: issue.createdAt
    });
  });

  // 3. Repeated deferrals (orders deferred > 1 time)
  const repeatedDeferrals = await Order.find({ deferredCount: { $gt: 1 }, status: 'DEFERRED' })
    .populate('outlet');
  repeatedDeferrals.forEach(o => {
    alerts.push({
      type: 'REPEATED_DEFERRAL',
      severity: 'CRITICAL',
      title: `Order ${o.orderRef} Deferred ${o.deferredCount} Times`,
      message: `Outlet ${o.outlet?.name || o.outlet?.outletId} order deferred repeatedly. High priority SLA risk.`,
      entityId: o._id,
      timestamp: o.lastDeferredAt
    });
  });

  res.status(200).json(new ApiResponse(200, alerts, `Retrieved ${alerts.length} operational alerts`));
});

/**
 * Critical incidents for dispatcher intervention
 * GET /api/v1/dispatcher/critical-incidents
 */
const getCriticalIncidents = asyncHandler(async (req, res) => {
  const incidents = await Issue.find({
    type: { $in: ['VEHICLE_BREAKDOWN', 'REEFER_FAILURE', 'ACCIDENT'] },
    status: { $in: ['OPEN', 'INVESTIGATING'] }
  })
    .populate('vehicle trip order reportedBy')
    .sort({ createdAt: -1 });

  res.status(200).json(new ApiResponse(200, incidents, `Retrieved ${incidents.length} critical incidents`));
});

module.exports = {
  getDispatcherDashboard,
  getDispatcherAlerts,
  getCriticalIncidents
};
