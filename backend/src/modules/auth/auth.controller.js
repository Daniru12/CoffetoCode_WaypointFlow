const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../users/user.model');
const { JWT_SECRET } = require('../../middlewares/auth.middleware');
const config = require('../../config/env');
const ApiResponse = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');

const tokenExpiresIn = config.jwt.expiresIn || '24h';

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

module.exports = {
  login,
  getMe
};
