const jwt = require('jsonwebtoken');
const config = require('../config/env');
const User = require('../modules/users/user.model');
const ApiResponse = require('../utils/apiResponse');

const JWT_SECRET = config.jwt.secret;

/**
 * Middleware to authenticate requests via JWT Bearer Token
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json(new ApiResponse(401, null, 'Authorization token required'));
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await User.findById(decoded.id).select('-password');
    if (!user || !user.isActive) {
      return res.status(401).json(new ApiResponse(401, null, 'User not found or inactive'));
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json(new ApiResponse(401, null, 'Token expired'));
    }
    return res.status(401).json(new ApiResponse(401, null, 'Invalid authentication token'));
  }
};

/**
 * Middleware to restrict access based on user role(s)
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json(
        new ApiResponse(403, null, `Forbidden: requires one of [${allowedRoles.join(', ')}]`)
      );
    }
    next();
  };
};

module.exports = {
  authenticate,
  authorize,
  JWT_SECRET
};
