import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export const RoleRoute = ({ allowedRoles, children }) => {
  const { user, getRoleRedirect } = useAuth();

  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to={getRoleRedirect(user?.role)} replace />;
  }

  return children;
};
