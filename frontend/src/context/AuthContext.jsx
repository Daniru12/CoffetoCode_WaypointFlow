import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/auth.api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('waypoint_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('waypoint_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verify current token on mount
    const checkAuth = async () => {
      if (token) {
        try {
          const res = await authApi.getMe();
          if (res.data) {
            setUser(res.data);
            localStorage.setItem('waypoint_user', JSON.stringify(res.data));
          }
        } catch (err) {
          console.warn('Session verification failed:', err.message);
          // Only clear if 401
          if (err.message.includes('401') || err.message.includes('expired')) {
            logout();
          }
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email, password) => {
    const res = await authApi.login({ email, password });
    const { user: userData, token: userToken } = res.data;

    setUser(userData);
    setToken(userToken);
    localStorage.setItem('waypoint_user', JSON.stringify(userData));
    localStorage.setItem('waypoint_token', userToken);

    return userData;
  };

  const register = async (payload) => {
    const res = await authApi.register(payload);
    const { user: userData, token: userToken } = res.data;

    setUser(userData);
    setToken(userToken);
    localStorage.setItem('waypoint_user', JSON.stringify(userData));
    localStorage.setItem('waypoint_token', userToken);

    return userData;
  };

  const logout = () => {
    try {
      authApi.logout().catch(() => {});
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem('waypoint_user');
      localStorage.removeItem('waypoint_token');
    }
  };

  const getRoleRedirect = (role = user?.role) => {
    switch (role) {
      case 'ADMIN':
        return '/admin/users';
      case 'STORE_MANAGER':
        return '/store/dashboard';
      case 'DISPATCHER':
        return '/dispatcher/dashboard';
      case 'LOADER':
        return '/loader/jobs';
      case 'DRIVER':
        return '/driver/route';
      default:
        return '/login';
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!token && !!user,
        login,
        register,
        logout,
        getRoleRedirect,
        isAdmin: user?.role === 'ADMIN',
        isDispatcher: user?.role === 'DISPATCHER',
        isStoreManager: user?.role === 'STORE_MANAGER',
        isLoader: user?.role === 'LOADER',
        isDriver: user?.role === 'DRIVER'
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
