const Outlet = require('./outlet.model');
const ApiResponse = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');

/**
 * Get all outlets with optional filters
 * GET /api/v1/outlets
 */
const getOutlets = asyncHandler(async (req, res) => {
  const { brand, depot, district, parkingConstraint } = req.query;
  const filter = {};

  if (brand) filter.brand = brand;
  if (depot) filter.depot = depot;
  if (district) filter.district = district;
  if (parkingConstraint) filter.parkingConstraint = parkingConstraint;

  const outlets = await Outlet.find(filter).sort({ outletId: 1 });
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
  });

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

module.exports = {
  getOutlets,
  getOutletById,
  createOutlet
};
