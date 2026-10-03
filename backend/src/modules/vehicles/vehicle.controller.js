const Vehicle = require('./vehicle.model');
const ApiResponse = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const auditService = require('../../services/audit.service');

/**
 * Get all vehicles with optional filters
 * GET /api/v1/vehicles
 */
const getVehicles = asyncHandler(async (req, res) => {
  const { depot, status, temp, type } = req.query;
  const filter = {};

  if (depot) filter.depot = depot;
  if (status) filter.status = status;
  if (temp) filter.temp = temp;
  if (type) filter.type = type;

  const vehicles = await Vehicle.find(filter).populate('assignedDriver', 'name email').sort({ vehicleId: 1 });
  res.status(200).json(new ApiResponse(200, vehicles, `Retrieved ${vehicles.length} vehicles`));
});

/**
 * Get vehicle by vehicleId or ObjectId
 * GET /api/v1/vehicles/:id
 */
const getVehicleById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const vehicle = await Vehicle.findOne({
    $or: [{ vehicleId: id }, ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : [])]
  }).populate('assignedDriver', 'name email');

  if (!vehicle) {
    return res.status(404).json(new ApiResponse(404, null, `Vehicle '${id}' not found`));
  }

  res.status(200).json(new ApiResponse(200, vehicle, 'Vehicle retrieved'));
});

/**
 * Create vehicle
 * POST /api/v1/vehicles
 */
const createVehicle = asyncHandler(async (req, res) => {
  const vehicle = await Vehicle.create(req.body);
  res.status(201).json(new ApiResponse(201, vehicle, 'Vehicle created successfully'));
});

/**
 * Update vehicle status (e.g. Workshop, Breakdown, Ready)
 * PATCH /api/v1/vehicles/:id/status
 */
const updateVehicleStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, reason, assignedDriver } = req.body;

  const vehicle = await Vehicle.findOne({
    $or: [{ vehicleId: id }, ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : [])]
  });

  if (!vehicle) {
    return res.status(404).json(new ApiResponse(404, null, `Vehicle '${id}' not found`));
  }

  const prevStatus = vehicle.status;
  if (status) vehicle.status = status;
  if (assignedDriver !== undefined) vehicle.assignedDriver = assignedDriver;
  await vehicle.save();

  await auditService.log({
    user: req.user,
    action: 'VEHICLE_STATUS_CHANGED',
    entityType: 'Vehicle',
    entityId: vehicle._id,
    previousData: { status: prevStatus },
    newData: { status: vehicle.status },
    reason
  });

  res.status(200).json(new ApiResponse(200, vehicle, 'Vehicle status updated'));
});

module.exports = {
  getVehicles,
  getVehicleById,
  createVehicle,
  updateVehicleStatus
};
