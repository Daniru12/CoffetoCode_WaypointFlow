const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../users/user.model');
const { JWT_SECRET } = require('../../middlewares/auth.middleware');
const config = require('../../config/env');
const ApiResponse = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');

const tokenExpiresIn = config.jwt.expiresIn || '24h';

const Vehicle = require('../vehicles/vehicle.model');
const auditService = require('../../services/audit.service');

const ALLOWED_ROLES = ['ADMIN', 'STORE_MANAGER', 'DISPATCHER', 'LOADER', 'DRIVER'];

/**
 * Register a new user and issue JWT
 * POST /api/v1/auth/register
 */
const register = asyncHandler(async (req, res) => {
  const {
    name,
    email,
    password,
    role,
    depot,
    outlet,
    outletId,
    assignedVehicle,
    licenseNumber,
    licenseCategory,
    licenseExpiryDate,
    phone,
    emergencyContact
  } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json(new ApiResponse(400, null, 'name, email, password, and role are required'));
  }

  if (!ALLOWED_ROLES.includes(role)) {
    return res.status(400).json(
      new ApiResponse(400, null, `Invalid role. Must be one of: ${ALLOWED_ROLES.join(', ')}`)
    );
  }

  const existing = await User.findOne({ email });
  if (existing) {
    return res.status(409).json(new ApiResponse(409, null, 'Email is already registered'));
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    role,
    depot: depot || null,
    outlet: outlet || null,
    outletId: outletId || null,
    assignedVehicle: role === 'DRIVER' ? (assignedVehicle || null) : null,
    licenseNumber: role === 'DRIVER' ? (licenseNumber || null) : null,
    licenseCategory: role === 'DRIVER' ? (licenseCategory || 'HEAVY_COMMERCIAL') : null,
    licenseExpiryDate: (role === 'DRIVER' && licenseExpiryDate) ? new Date(licenseExpiryDate) : null,
    phone: phone || null,
    emergencyContact: emergencyContact || null,
    isActive: true
  });

  if (role === 'DRIVER' && assignedVehicle) {
    await Vehicle.findByIdAndUpdate(assignedVehicle, { assignedDriver: user._id });
  }

  if (req.user) {
    await auditService.log({
      user: req.user,
      action: 'USER_REGISTERED',
      entityType: 'User',
      entityId: user._id,
      previousData: null,
      newData: { name: user.name, email: user.email, role: user.role, depot: user.depot, outletId: user.outletId },
      reason: `Provisioned new ${user.role} account`
    });
  }

  const token = jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
      depot: user.depot,
      outlet: user.outlet || null
    },
    JWT_SECRET,
    { expiresIn: tokenExpiresIn }
  );

  const userResponse = {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    depot: user.depot,
    outlet: user.outlet,
    outletId: user.outletId,
    assignedVehicle: user.assignedVehicle
  };

  res.status(201).json(new ApiResponse(201, { user: userResponse, token }, 'User registered successfully'));
});

/**
 * Login user and issue JWT
 * POST /api/v1/auth/login
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json(new ApiResponse(400, null, 'Email and password are required'));
  }

  const user = await User.findOne({ email }).populate('outlet');
  if (!user) {
    return res.status(401).json(new ApiResponse(401, null, 'Invalid credentials'));
  }

  if (!user.isActive) {
    return res.status(403).json(new ApiResponse(403, null, 'User account is inactive'));
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(401).json(new ApiResponse(401, null, 'Invalid credentials'));
  }

  user.lastLogin = new Date();
  await user.save();

  const token = jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
      depot: user.depot,
      outlet: user.outlet ? user.outlet._id : null
    },
    JWT_SECRET,
    { expiresIn: tokenExpiresIn }
  );

  const userResponse = {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    depot: user.depot,
    outlet: user.outlet
  };

  res.status(200).json(new ApiResponse(200, { user: userResponse, token }, 'Login successful'));
});

/**
 * Get current authenticated user
 * GET /api/v1/auth/me
 */
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate('outlet').select('-password');
  res.status(200).json(new ApiResponse(200, user, 'Profile retrieved'));
});

/**
 * Logout user
 * POST /api/v1/auth/logout
 */
const logout = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, null, 'Logged out successfully'));
});

/**
 * Refresh JWT token
 * POST /api/v1/auth/refresh
 */
const refresh = asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json(new ApiResponse(401, null, 'Token required'));
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true });
    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      return res.status(401).json(new ApiResponse(401, null, 'User not found or inactive'));
    }

    const newToken = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role,
        depot: user.depot,
        outlet: user.outlet ? user.outlet._id : null
      },
      JWT_SECRET,
      { expiresIn: tokenExpiresIn }
    );

    res.status(200).json(new ApiResponse(200, { token: newToken }, 'Token refreshed'));
  } catch (err) {
    return res.status(401).json(new ApiResponse(401, null, 'Invalid token for refresh'));
  }
});

/**
 * Change User Password
 * PUT /api/v1/auth/password
 */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json(new ApiResponse(400, null, 'currentPassword and newPassword are required'));
  }

  if (newPassword.length < 8) {
    return res.status(400).json(new ApiResponse(400, null, 'New password must be at least 8 characters'));
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    return res.status(404).json(new ApiResponse(404, null, 'User not found'));
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    return res.status(401).json(new ApiResponse(401, null, 'Incorrect current password'));
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  user.password = hashedPassword;
  await user.save();

  res.status(200).json(new ApiResponse(200, null, 'Password changed successfully'));
});

module.exports = {
  register,
  login,
  getMe,
  logout,
  refresh,
  changePassword
};

