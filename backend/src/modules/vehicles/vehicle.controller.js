const Vehicle = require('./vehicle.model');
const ApiResponse = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');

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

  const vehicles = await Vehicle.find(filter).sort({ vehicleId: 1 });
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
  });

  if (!vehicle) {
    return res.status(404).json(new ApiResponse(404, null, `Vehicle '${id}' not found`));
  }

  res.status(200).json(new ApiResponse(200, vehicle, 'Vehicle retrieved'));
});

module.exports = {
  getVehicles,
  getVehicleById
};
