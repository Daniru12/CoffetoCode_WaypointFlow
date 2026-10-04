import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ordersApi } from '../api/orders.api';
import { useAuth } from '../hooks/useAuth';

const OutletContext = createContext(null);

/**
 * OutletProvider wraps the Store Manager workspace.
 * It fetches all assigned outlets for the logged-in manager,
 * manages the "active outlet" selection, and exposes it to all child pages.
 */
export const OutletProvider = ({ children }) => {
  const { user, isStoreManager } = useAuth();
  const [outlets, setOutlets] = useState([]);
  const [activeOutlet, setActiveOutlet] = useState(null);
  const [loadingOutlets, setLoadingOutlets] = useState(false);

  const fetchOutlets = useCallback(async () => {
    if (!isStoreManager) return;
    setLoadingOutlets(true);
    try {
      const res = await ordersApi.getMyOutlets();
      const data = Array.isArray(res.data) ? res.data : [];
      setOutlets(data);

      // Auto-select: restore from sessionStorage or default to first
      const savedId = sessionStorage.getItem('waypoint_active_outlet');
      const saved = data.find(o => o._id === savedId);
      if (saved) {
        setActiveOutlet(saved);
      } else if (data.length === 1) {
        setActiveOutlet(data[0]);
      } else if (data.length > 1) {
        // For multiple, default to first but let user switch
        setActiveOutlet(data[0]);
      } else {
        setActiveOutlet(null);
      }
    } catch (err) {
      console.error('Failed to load assigned outlets:', err.message);
    } finally {
      setLoadingOutlets(false);
    }
  }, [isStoreManager]);

  useEffect(() => {
    fetchOutlets();
  }, [fetchOutlets]);

  const switchOutlet = (outlet) => {
    setActiveOutlet(outlet);
    if (outlet) {
      sessionStorage.setItem('waypoint_active_outlet', outlet._id);
    } else {
      sessionStorage.removeItem('waypoint_active_outlet');
    }
  };

  return (
    <OutletContext.Provider value={{
      outlets,
      activeOutlet,
      loadingOutlets,
      switchOutlet,
      refreshOutlets: fetchOutlets,
      hasMultipleOutlets: outlets.length > 1,
      hasNoOutlets: outlets.length === 0
    }}>
      {children}
    </OutletContext.Provider>
  );
};

export const useOutlet = () => {
  const context = useContext(OutletContext);
  if (!context) {
    throw new Error('useOutlet must be used within an OutletProvider');
  }
  return context;
};
