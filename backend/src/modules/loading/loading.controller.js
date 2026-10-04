const LoadingJob = require('./loadingJob.model');
const Trip = require('../trips/trip.model');
const Vehicle = require('../vehicles/vehicle.model');
const Order = require('../orders/order.model');
const Issue = require('../issues/issue.model');
const ApiResponse = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const socketService = require('../../services/socket.service');
const auditService = require('../../services/audit.service');
const storageService = require('../../services/storage.service');

/**
 * Get loading jobs for today or active jobs
 * GET /api/v1/loading/jobs/today
 */
const getJobsToday = asyncHandler(async (req, res) => {
  const { status, depot } = req.query;
  const filter = {};
  if (status) filter.status = status;

  let jobs = await LoadingJob.find(filter)
    .populate({
      path: 'trip',
      populate: { path: 'vehicle driver plan' }
    })
    .populate('vehicle loader items.order')
    .sort({ createdAt: -1 });

  if (depot) {
    jobs = jobs.filter(j => j.vehicle && j.vehicle.depot === depot);
  }

  res.status(200).json(new ApiResponse(200, jobs, `Retrieved ${jobs.length} loading jobs`));
});

/**
 * Get loading job by ID or loadingJobRef
 * GET /api/v1/loading/jobs/:id
 */
const getJobById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const job = await LoadingJob.findOne({
    $or: [{ loadingJobRef: id }, ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : [])]
  })
    .populate({
      path: 'trip',
      populate: { path: 'vehicle driver' }
    })
    .populate({
      path: 'items.order',
      populate: { path: 'outlet' }
    })
    .populate('vehicle loader');

  if (!job) {
    return res.status(404).json(new ApiResponse(404, null, 'Loading job not found'));
  }

  res.status(200).json(new ApiResponse(200, job, 'Loading job retrieved'));
});

/**
 * Start loading job
 * POST /api/v1/loading/jobs/:id/start
 */
const startJob = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const job = await LoadingJob.findOne({
    $or: [{ loadingJobRef: id }, ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : [])]
  });

  if (!job) {
    return res.status(404).json(new ApiResponse(404, null, 'Loading job not found'));
  }

  job.status = 'LOADING';
  job.loader = req.user._id;
  job.startedAt = new Date();
  await job.save();

  // Update trip and vehicle
  await Trip.findByIdAndUpdate(job.trip, { status: 'LOADING' });
  await Vehicle.findByIdAndUpdate(job.vehicle, { status: 'LOADING' });

  // Update orders status
  const orderIds = job.items.map(i => i.order);
  await Order.updateMany({ _id: { $in: orderIds } }, { status: 'LOADING' });

  socketService.emitLoadingStarted(job);

  res.status(200).json(new ApiResponse(200, job, 'Loading started'));
});

/**
 * Update loaded quantity / status of a job item
 * PATCH /api/v1/loading/jobs/:id/items/:itemId
 */
const updateItem = asyncHandler(async (req, res) => {
  const { id, itemId } = req.params;
  const { loadedQty, status, notes } = req.body;

  const job = await LoadingJob.findOne({
    $or: [{ loadingJobRef: id }, ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : [])]
  });

  if (!job) {
    return res.status(404).json(new ApiResponse(404, null, 'Loading job not found'));
  }

  const item = job.items.id(itemId) || job.items.find(i => (i.order?._id || i.order)?.toString() === itemId.toString());
  if (!item) {
    return res.status(404).json(new ApiResponse(404, null, 'Item not found in loading job'));
  }

  if (loadedQty !== undefined) item.loadedQty = loadedQty;
  if (status) item.status = status;
  if (notes) item.notes = notes;

  await job.save();
  res.status(200).json(new ApiResponse(200, job, 'Item updated'));
});

/**
 * Report loading shortfall
 * POST /api/v1/loading/jobs/:id/shortfall
 */
const reportShortfall = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { itemId, missingQty, reason } = req.body;

  const job = await LoadingJob.findOne({
    $or: [{ loadingJobRef: id }, ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : [])]
  });

  if (!job) {
    return res.status(404).json(new ApiResponse(404, null, 'Loading job not found'));
  }

  job.status = 'SHORTFALL';

  const item = job.items.id(itemId) || job.items.find(i => (i.order?._id || i.order)?.toString() === itemId.toString());
  if (item) {
    item.status = 'SHORTFALL';
    item.notes = reason || `Shortfall of ${missingQty} units`;
  }

  // Upload photo evidence if provided via multer
  let evidenceUrls = [];
  if (req.files && req.files.length > 0) {
    for (const f of req.files) {
      const url = await storageService.uploadFile(f.buffer, f.originalname, f.mimetype, 'loading-damage');
      evidenceUrls.push(url);
    }
  }

  await job.save();

  // Create Issue
  const issueRef = `ISS-SHT-${Date.now().toString().slice(-6)}`;
  await Issue.create({
    issueRef,
    type: 'WRONG_QUANTITY',
    source: 'LOADER',
    trip: job.trip,
    vehicle: job.vehicle,
    reportedBy: req.user._id,
    description: `Loading Shortfall: ${reason || 'Missing items during loading'}`,
    quantity: missingQty,
    evidenceUrls,
    severity: 'HIGH',
    status: 'OPEN'
  });

  socketService.emitLoadingShortfall({ jobId: job._id, missingQty, reason, evidenceUrls });
  await auditService.log({
    user: req.user,
    action: 'LOADING_SHORTFALL',
    entityType: 'LoadingJob',
    entityId: job._id,
    reason: `Shortfall of ${missingQty} units: ${reason}`
  });

  res.status(200).json(new ApiResponse(200, job, 'Shortfall recorded; dispatcher alerted'));
});

/**
 * Report damaged items during loading
 * POST /api/v1/loading/jobs/:id/damage
 */
const reportDamage = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { itemId, damagedQty, reason } = req.body;

  const job = await LoadingJob.findOne({
    $or: [{ loadingJobRef: id }, ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : [])]
  });

  if (!job) {
    return res.status(404).json(new ApiResponse(404, null, 'Loading job not found'));
  }

  const item = job.items.id(itemId) || job.items.find(i => (i.order?._id || i.order)?.toString() === itemId.toString());
  if (item) {
    item.status = 'DAMAGED';
    item.notes = reason || `Damaged: ${damagedQty} units`;
  }

  let evidenceUrls = [];
  if (req.files && req.files.length > 0) {
    for (const f of req.files) {
      const url = await storageService.uploadFile(f.buffer, f.originalname, f.mimetype, 'loading-damage');
      evidenceUrls.push(url);
    }
  }

  await job.save();

  const issueRef = `ISS-DMG-${Date.now().toString().slice(-6)}`;
  await Issue.create({
    issueRef,
    type: 'DAMAGED_GOODS',
    source: 'LOADER',
    trip: job.trip,
    vehicle: job.vehicle,
    reportedBy: req.user._id,
    description: `Loading Damage: ${reason}`,
    quantity: damagedQty,
    evidenceUrls,
    severity: 'HIGH',
    status: 'OPEN'
  });

  res.status(200).json(new ApiResponse(200, job, 'Damage reported and logged'));
});

/**
 * Complete loading job
 * POST /api/v1/loading/jobs/:id/complete
 */
const completeJob = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const job = await LoadingJob.findOne({
    $or: [{ loadingJobRef: id }, ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : [])]
  });

  if (!job) {
    return res.status(404).json(new ApiResponse(404, null, 'Loading job not found'));
  }

  job.status = 'COMPLETED';
  job.completedAt = new Date();
  await job.save();

  socketService.emitLoadingCompleted(job);

  res.status(200).json(new ApiResponse(200, job, 'Loading completed'));
});

/**
 * Mark vehicle ready for departure
 * POST /api/v1/loading/jobs/:id/ready-for-departure
 */
const readyForDeparture = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const job = await LoadingJob.findOne({
    $or: [{ loadingJobRef: id }, ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : [])]
  });

  if (!job) {
    return res.status(404).json(new ApiResponse(404, null, 'Loading job not found'));
  }

  job.status = 'READY_FOR_DEPARTURE';
  await job.save();

  await Trip.findByIdAndUpdate(job.trip, { status: 'READY' });
  await Vehicle.findByIdAndUpdate(job.vehicle, { status: 'READY' });

  res.status(200).json(new ApiResponse(200, job, 'Vehicle marked ready for departure'));
});

module.exports = {
  getJobsToday,
  getJobById,
  startJob,
  updateItem,
  reportShortfall,
  reportDamage,
  completeJob,
  readyForDeparture
};
