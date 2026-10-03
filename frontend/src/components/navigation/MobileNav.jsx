import React from 'react';
import { NavLink } from 'react-router-dom';
import { Compass, RotateCcw, AlertTriangle, LogOut } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useSyncQueue } from '../../hooks/useSyncQueue';

export const MobileNav = () => {
  const { logout } = useAuth();
  const { pendingCount } = useSyncQueue();

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: '64px',
      backgroundColor: '#FFFFFF',
      borderTop: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-around',
      zIndex: 50,
      boxShadow: '0 -2px 10px rgba(0,0,0,0.05)'
    }}>
      <NavLink
        to="/driver/route"
        style={({ isActive }) => ({
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2px',
          color: isActive ? 'var(--primary-green)' : '#64748B',
          fontSize: '0.75rem',
          fontWeight: isActive ? 700 : 500
        })}
      >
        <Compass size={22} />
        <span>Today's Route</span>
      </NavLink>

      <NavLink
        to="/driver/sync"
        style={({ isActive }) => ({
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2px',
          position: 'relative',
          color: isActive ? 'var(--primary-green)' : '#64748B',
          fontSize: '0.75rem',
          fontWeight: isActive ? 700 : 500
        })}
      >
        <div style={{ position: 'relative' }}>
          <RotateCcw size={22} />
          {pendingCount > 0 && (
            <span style={{
              position: 'absolute',
              top: '-4px',
              right: '-8px',
              backgroundColor: '#DC2626',
              color: '#FFFFFF',
              borderRadius: '9999px',
              fontSize: '0.65rem',
              fontWeight: 800,
              padding: '1px 5px'
            }}>
              {pendingCount}
            </span>
          )}
        </div>
        <span>Sync Queue</span>
      </NavLink>

      <button
        onClick={logout}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2px',
          color: '#64748B',
          fontSize: '0.75rem',
          fontWeight: 500
        }}
      >
        <LogOut size={22} />
        <span>Sign Out</span>
      </button>
    </nav>
  );
};
