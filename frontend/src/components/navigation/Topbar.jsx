import React from 'react';
import { LogOut, Wifi, WifiOff, Bell } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../hooks/useSocket';
import { useOffline } from '../../hooks/useOffline';

export const Topbar = ({ title, subtitle }) => {
  const { user, logout } = useAuth();
  const { connected } = useSocket();
  const { isOffline } = useOffline();

  return (
    <header style={{
      height: '68px',
      backgroundColor: 'var(--bg-card)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 2rem',
      flexShrink: 0
    }}>
      <div>
        <h1 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', margin: 0 }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
            {subtitle}
          </p>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        {/* Offline / Online Network Indicator */}
        {isOffline ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.3rem 0.75rem',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--error-bg)',
            color: 'var(--error-text)',
            fontSize: '0.8rem',
            fontWeight: 600
          }}>
            <WifiOff size={14} />
            <span>Working Offline</span>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.3rem 0.75rem',
            borderRadius: 'var(--radius-full)',
            backgroundColor: connected ? 'var(--success-bg)' : '#FEF3C7',
            color: connected ? 'var(--success)' : '#92400E',
            fontSize: '0.75rem',
            fontWeight: 600
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: connected ? '#025E4C' : '#D97706',
              display: 'inline-block'
            }} />
            <span>{connected ? 'Live Sync Active' : 'Connecting...'}</span>
          </div>
        )}

        {/* User Role Tag */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{user?.name}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user?.email}</div>
        </div>

        {/* Logout Button */}
        <button
          onClick={logout}
          title="Sign out of WaypointFlow"
          style={{
            padding: '0.5rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
};
