import React from 'react';
import { WifiOff, RefreshCw, AlertCircle, CheckCircle, Database } from 'lucide-react';

export const OfflineBanner = ({
  isOffline = false,
  pendingCount = 0,
  isSyncing = false,
  conflictDetected = false,
  onResolveConflict
}) => {
  if (!isOffline && pendingCount === 0 && !isSyncing && !conflictDetected) {
    return null;
  }

  if (conflictDetected) {
    return (
      <div style={{
        backgroundColor: '#FEF3C7',
        border: '1px solid #F59E0B',
        borderRadius: 'var(--radius-md)',
        padding: '0.85rem 1rem',
        marginBottom: '1rem',
        color: '#92400E'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
          <AlertCircle size={18} />
          <strong style={{ fontSize: '0.95rem' }}>Route Update Detected (Conflict Resolution)</strong>
        </div>
        <p style={{ margin: '0.2rem 0 0.5rem', fontSize: '0.82rem' }}>
          Completed stops have been preserved locally. The remaining unvisited stops were re-sequenced by the central dispatcher.
        </p>
        <button
          onClick={onResolveConflict}
          style={{
            padding: '0.4rem 0.75rem',
            backgroundColor: '#D97706',
            color: '#FFFFFF',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            fontSize: '0.8rem',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          Merge Updated Route
        </button>
      </div>
    );
  }

  if (isSyncing) {
    return (
      <div style={{
        backgroundColor: '#EFF6FF',
        border: '1px solid #93C5FD',
        borderRadius: 'var(--radius-md)',
        padding: '0.75rem 1rem',
        marginBottom: '1rem',
        color: '#1E40AF',
        display: 'flex',
        alignItems: 'center',
        gap: '0.65rem'
      }}>
        <RefreshCw size={18} className="animate-spin" />
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>Connection restored</div>
          <div style={{ fontSize: '0.75rem' }}>Syncing {pendingCount} offline records to central server...</div>
        </div>
      </div>
    );
  }

  if (isOffline) {
    return (
      <div style={{
        backgroundColor: '#FEF2F2',
        border: '1px solid #FCA5A5',
        borderRadius: 'var(--radius-md)',
        padding: '0.75rem 1rem',
        marginBottom: '1rem',
        color: '#991B1B'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
          <WifiOff size={18} />
          <strong style={{ fontSize: '0.9rem' }}>You're Offline</strong>
        </div>
        <div style={{ fontSize: '0.78rem', color: '#7F1D1D' }}>
          Route data is available from local storage. Your delivery confirmations, photos, and signatures will be safely saved on this device.
        </div>
        {pendingCount > 0 && (
          <div style={{
            marginTop: '0.4rem',
            paddingTop: '0.4rem',
            borderTop: '1px solid #FECACA',
            fontSize: '0.75rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem'
          }}>
            <Database size={13} />
            <span>Pending Sync: {pendingCount} records queued locally</span>
          </div>
        )}
      </div>
    );
  }

  if (pendingCount > 0) {
    return (
      <div style={{
        backgroundColor: '#F8FAFC',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '0.65rem 1rem',
        marginBottom: '1rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
          <Database size={16} color="var(--primary-green)" />
          <span>Pending Sync Queue: <strong>{pendingCount} records</strong> ready for upload</span>
        </div>
      </div>
    );
  }

  return null;
};
