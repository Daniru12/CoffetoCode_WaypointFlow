const ApiResponse = require('../utils/apiResponse');

/**
 * Middleware to restrict access based on allowed roles
 * Usage: checkRole('DISPATCHER', 'STORE_MANAGER')
 */
const checkRole = (...allowedRoles) => {
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
  checkRole
};
