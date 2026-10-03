const User = require('./user.model');
const ApiResponse = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');

const getUsers = asyncHandler(async (req, res) => {
  const { role, depot } = req.query;
  const filter = {};
  if (role) filter.role = role;
  if (depot) filter.depot = depot;

  const users = await User.find(filter).select('-password').populate('outlet assignedVehicle');
  res.status(200).json(new ApiResponse(200, users, `Retrieved ${users.length} users`));
});

const getDrivers = asyncHandler(async (req, res) => {
  const { depot } = req.query;
  const filter = { role: 'DRIVER' };
  if (depot) filter.depot = depot;

  const drivers = await User.find(filter).select('-password').populate('assignedVehicle');
  res.status(200).json(new ApiResponse(200, drivers, `Retrieved ${drivers.length} drivers`));
});

const getLoaders = asyncHandler(async (req, res) => {
  const { depot } = req.query;
  const filter = { role: 'LOADER' };
  if (depot) filter.depot = depot;

  const loaders = await User.find(filter).select('-password');
  res.status(200).json(new ApiResponse(200, loaders, `Retrieved ${loaders.length} loaders`));
});

module.exports = {
  getUsers,
  getDrivers,
  getLoaders
};
