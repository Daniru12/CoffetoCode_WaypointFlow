import React from 'react';
import { Outlet } from 'react-router-dom';
import { MobileNav } from '../components/navigation/MobileNav';
import { useOffline } from '../hooks/useOffline';
import { useSyncQueue } from '../hooks/useSyncQueue';
import { WifiOff, RotateCcw, AlertTriangle } from 'lucide-react';

export const DriverLayout = () => {
  const { isOffline } = useOffline();
  const { pendingCount, triggerSync, syncStatus } = useSyncQueue();

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', paddingBottom: '70px' }}>
      {/* Offline Alert Header Banner */}
      {isOffline && (
        <div style={{
          backgroundColor: '#991B1B',
          color: '#FFFFFF',
          padding: '0.65rem 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.85rem',
          fontWeight: 600,
          position: 'sticky',
          top: 0,
          zIndex: 100
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <WifiOff size={18} />
            <span>You're Offline — Route data is available. Changes will save locally.</span>
          </div>
        </div>
      )}

      {/* Pending Sync Floating Notice (when online with pending events) */}
      {!isOffline && pendingCount > 0 && (
        <div style={{
          backgroundColor: '#FEF3C7',
          borderBottom: '1px solid #FCD34D',
          color: '#92400E',
          padding: '0.5rem 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.825rem',
          fontWeight: 600
        }}>
          <span>Pending Sync: {pendingCount} offline action(s) stored</span>
          <button
            onClick={triggerSync}
            style={{
              padding: '0.25rem 0.65rem',
              backgroundColor: '#D97706',
              color: '#FFFFFF',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 700,
              fontSize: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}
          >
            <RotateCcw size={12} />
            <span>{syncStatus === 'SYNCING' ? 'Syncing...' : 'Sync Now'}</span>
          </button>
        </div>
      )}

      <main style={{ padding: '1rem', maxWidth: '640px', margin: '0 auto' }}>
        <Outlet />
      </main>

      <MobileNav />
    </div>
  );
};
