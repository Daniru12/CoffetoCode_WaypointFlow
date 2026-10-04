const Outlet = require('./outlet.model');
const User = require('../users/user.model');
const ApiResponse = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const auditService = require('../../services/audit.service');

/**
 * Get all outlets with assignment info and optional filters
 * GET /api/v1/outlets
 * Supports: brand, depot, district, parkingConstraint, assignmentStatus, search
 */
const getOutlets = asyncHandler(async (req, res) => {
  const { brand, depot, district, parkingConstraint, assignmentStatus, search } = req.query;
  const filter = {};

  if (brand) filter.brand = brand;
  if (depot) filter.depot = depot;
  if (district) filter.district = district;
  if (parkingConstraint) filter.parkingConstraint = parkingConstraint;

  if (assignmentStatus === 'assigned') filter.assignedManager = { $ne: null };
  if (assignmentStatus === 'unassigned') filter.assignedManager = null;

  if (search) {
    const regex = new RegExp(search, 'i');
    filter.$or = [
      { outletId: regex },
      { name: regex },
      { district: regex }
    ];
  }

  const outlets = await Outlet.find(filter)
    .populate('assignedManager', 'name email _id')
    .sort({ outletId: 1 });

  res.status(200).json(new ApiResponse(200, outlets, `Retrieved ${outlets.length} outlets`));
});

/**
 * Get outlet by outletId or ObjectId
 * GET /api/v1/outlets/:id
 */
const getOutletById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const outlet = await Outlet.findOne({
    $or: [{ outletId: id }, ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : [])]
  }).populate('assignedManager', 'name email _id');

  if (!outlet) {
    return res.status(404).json(new ApiResponse(404, null, `Outlet '${id}' not found`));
  }

  res.status(200).json(new ApiResponse(200, outlet, 'Outlet retrieved'));
});

/**
 * Create a new outlet
 * POST /api/v1/outlets
 */
const createOutlet = asyncHandler(async (req, res) => {
  const outlet = await Outlet.create(req.body);
  res.status(201).json(new ApiResponse(201, outlet, 'Outlet created successfully'));
});

/**
 * Get all active Store Managers with their current outlet assignment counts
 * GET /api/v1/outlets/store-managers
 */
const getStoreManagers = asyncHandler(async (req, res) => {
  const managers = await User.find({ role: 'STORE_MANAGER', isActive: true })
    .select('name email _id isActive')
    .lean();

  // Count outlets assigned to each manager in one aggregation
  const outletCounts = await Outlet.aggregate([
    { $match: { assignedManager: { $ne: null } } },
    { $group: { _id: '$assignedManager', count: { $sum: 1 } } }
  ]);

  const countMap = {};
  outletCounts.forEach(({ _id, count }) => {
    countMap[_id.toString()] = count;
  });

  const managersWithCounts = managers.map(m => ({
    ...m,
    outletCount: countMap[m._id.toString()] || 0
  }));

  res.status(200).json(new ApiResponse(200, managersWithCounts, `Retrieved ${managersWithCounts.length} store managers`));
});

/**
 * Bulk assign one Store Manager to many outlets
 * POST /api/v1/outlets/assign
 * Body: { managerId, outletIds: [], overwrite: false }
 */
const bulkAssignManager = asyncHandler(async (req, res) => {
  const { managerId, outletIds, overwrite = false } = req.body;

  if (!managerId || !Array.isArray(outletIds) || outletIds.length === 0) {
    return res.status(400).json(new ApiResponse(400, null, 'managerId and a non-empty outletIds array are required'));
  }

  // Validate manager is a real, active STORE_MANAGER
  const manager = await User.findOne({ _id: managerId, role: 'STORE_MANAGER', isActive: true });
  if (!manager) {
    return res.status(404).json(new ApiResponse(404, null, 'Store Manager not found or is inactive'));
  }

  // Fetch all target outlets
  const outlets = await Outlet.find({ _id: { $in: outletIds } }).populate('assignedManager', 'name _id');

  if (outlets.length === 0) {
    return res.status(404).json(new ApiResponse(404, null, 'No outlets found for the provided IDs'));
  }

  const alreadyAssigned = outlets.filter(o => o.assignedManager && o.assignedManager._id.toString() !== managerId);
  const eligible = overwrite ? outlets : outlets.filter(o => !o.assignedManager);

  if (eligible.length === 0) {
    return res.status(200).json(new ApiResponse(200, {
      assigned: 0,
      skipped: alreadyAssigned.length,
      skippedOutlets: alreadyAssigned.map(o => ({
        _id: o._id,
        outletId: o.outletId,
        name: o.name,
        existingManager: o.assignedManager ? { name: o.assignedManager.name } : null
      }))
    }, 'No outlets were eligible for assignment'));
  }

  const eligibleIds = eligible.map(o => o._id);
  await Outlet.updateMany({ _id: { $in: eligibleIds } }, { $set: { assignedManager: managerId } });

  const skipped = outlets.filter(o => !eligibleIds.map(id => id.toString()).includes(o._id.toString()));

  // Audit log
  if (req.user) {
    await auditService.log({
      user: req.user,
      action: 'BULK_ASSIGN_MANAGER',
      entityType: 'Outlet',
      entityId: managerId,
      previousData: null,
      newData: { assignedOutlets: eligibleIds.length, manager: manager.name, overwrite },
      reason: `Admin bulk-assigned ${eligibleIds.length} outlets to Store Manager ${manager.name}`
    });
  }

  res.status(200).json(new ApiResponse(200, {
    assigned: eligibleIds.length,
    skipped: skipped.length,
    skippedOutlets: skipped.map(o => ({
      _id: o._id,
      outletId: o.outletId,
      name: o.name,
      existingManager: o.assignedManager ? { name: o.assignedManager.name } : null
    }))
  }, `${eligibleIds.length} outlet(s) successfully assigned to ${manager.name}`));
});

/**
 * Remove manager assignment from outlets
 * POST /api/v1/outlets/unassign
 * Body: { outletIds: [] }
 */
const removeManagerFromOutlets = asyncHandler(async (req, res) => {
  const { outletIds } = req.body;

  if (!Array.isArray(outletIds) || outletIds.length === 0) {
    return res.status(400).json(new ApiResponse(400, null, 'outletIds array is required'));
  }

  const result = await Outlet.updateMany(
    { _id: { $in: outletIds } },
    { $set: { assignedManager: null } }
  );

  if (req.user) {
    await auditService.log({
      user: req.user,
      action: 'UNASSIGN_MANAGER',
      entityType: 'Outlet',
      entityId: 'BULK',
      previousData: null,
      newData: { unassignedOutlets: outletIds.length },
      reason: `Admin removed manager assignment from ${outletIds.length} outlet(s)`
    });
  }

  res.status(200).json(new ApiResponse(200, { modified: result.modifiedCount }, `Manager removed from ${result.modifiedCount} outlet(s)`));
});

module.exports = {
  getOutlets,
  getOutletById,
  createOutlet,
  getStoreManagers,
  bulkAssignManager,
  removeManagerFromOutlets
};
