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

const bcrypt = require('bcryptjs');
const Vehicle = require('../vehicles/vehicle.model');
const auditService = require('../../services/audit.service');

const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, role, depot, outlet, outletId, assignedVehicle, isActive, licenseNumber, licenseCategory, licenseExpiryDate, phone, emergencyContact } = req.body;

  const user = await User.findById(id);
  if (!user) {
    return res.status(404).json(new ApiResponse(404, null, 'User not found'));
  }

  const prevRole = user.role;
  const prevVehicle = user.assignedVehicle;

  if (name !== undefined) user.name = name;
  if (role !== undefined) user.role = role;
  if (depot !== undefined) user.depot = depot || null;
  if (outlet !== undefined) user.outlet = outlet || null;
  if (outletId !== undefined) user.outletId = outletId || null;
  if (isActive !== undefined) user.isActive = isActive;
  if (licenseNumber !== undefined) user.licenseNumber = licenseNumber;
  if (licenseCategory !== undefined) user.licenseCategory = licenseCategory;
  if (licenseExpiryDate !== undefined) user.licenseExpiryDate = licenseExpiryDate ? new Date(licenseExpiryDate) : null;
  if (phone !== undefined) user.phone = phone;
  if (emergencyContact !== undefined) user.emergencyContact = emergencyContact;

  if (assignedVehicle !== undefined) {
    const nextVehicleId = assignedVehicle || null;
    user.assignedVehicle = nextVehicleId;

    // Bidirectional sync with Vehicle model
    if (prevVehicle && String(prevVehicle) !== String(nextVehicleId)) {
      await Vehicle.findByIdAndUpdate(prevVehicle, { assignedDriver: null });
    }
    if (nextVehicleId) {
      await Vehicle.findByIdAndUpdate(nextVehicleId, { assignedDriver: user._id });
      // Clear any other user who was linked to this vehicle
      await User.updateMany({ _id: { $ne: user._id }, assignedVehicle: nextVehicleId }, { assignedVehicle: null });
    }
  }

  await user.save();

  if (req.user) {
    await auditService.log({
      user: req.user,
      action: 'USER_UPDATED',
      entityType: 'User',
      entityId: user._id,
      previousData: { role: prevRole, assignedVehicle: prevVehicle },
      newData: { role: user.role, assignedVehicle: user.assignedVehicle, name: user.name },
      reason: 'Staff profile updated by Administrator'
    });
  }

  const updatedUser = await User.findById(id).select('-password').populate('outlet assignedVehicle');
  res.status(200).json(new ApiResponse(200, updatedUser, 'User profile updated successfully'));
});

const toggleUserStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(id);
  if (!user) {
    return res.status(404).json(new ApiResponse(404, null, 'User not found'));
  }

  const prevStatus = user.isActive;
  user.isActive = req.body.isActive !== undefined ? req.body.isActive : !user.isActive;
  await user.save();

  if (req.user) {
    await auditService.log({
      user: req.user,
      action: 'USER_STATUS_CHANGED',
      entityType: 'User',
      entityId: user._id,
      previousData: { isActive: prevStatus },
      newData: { isActive: user.isActive },
      reason: `Staff account marked as ${user.isActive ? 'Active' : 'Suspended'}`
    });
  }

  res.status(200).json(new ApiResponse(200, { id: user._id, isActive: user.isActive }, `User marked as ${user.isActive ? 'Active' : 'Inactive'}`));
});

const resetUserPassword = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json(new ApiResponse(400, null, 'New password must be at least 8 characters long'));
  }

  const user = await User.findById(id);
  if (!user) {
    return res.status(404).json(new ApiResponse(404, null, 'User not found'));
  }

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();

  if (req.user) {
    await auditService.log({
      user: req.user,
      action: 'PASSWORD_RESET',
      entityType: 'User',
      entityId: user._id,
      previousData: null,
      newData: { email: user.email },
      reason: 'Security credentials reset by Administrator'
    });
  }

  res.status(200).json(new ApiResponse(200, null, 'User credentials reset successfully'));
});

module.exports = {
  getUsers,
  getDrivers,
  getLoaders,
  updateUser,
  toggleUserStatus,
  resetUserPassword
};
