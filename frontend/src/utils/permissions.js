export const ROLES = {
  STORE_MANAGER: 'STORE_MANAGER',
  DISPATCHER: 'DISPATCHER',
  LOADER: 'LOADER',
  DRIVER: 'DRIVER'
};

export const hasRole = (user, ...allowedRoles) => {
  if (!user || !user.role) return false;
  return allowedRoles.includes(user.role);
};
