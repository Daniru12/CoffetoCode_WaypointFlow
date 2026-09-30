import React, { useState, useEffect } from 'react';
import { syncQueue } from '../../offline/syncQueue';
import { syncManager } from '../../offline/syncManager';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { RotateCcw, CheckCircle2, Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import { useOffline } from '../../hooks/useOffline';
import { useSyncQueue } from '../../hooks/useSyncQueue';

export const OfflineSync = () => {
  const { isOffline } = useOffline();
  const { pendingCount, triggerSync, syncStatus } = useSyncQueue();
  const [queueItems, setQueueItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPendingItems();
  }, [pendingCount, syncStatus]);

  const loadPendingItems = async () => {
    const items = await syncQueue.getPending();
    setQueueItems(items);
  };

  const handleManualSync = async () => {
    setLoading(true);
    await triggerSync();
    await loadPendingItems();
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>Offline Synchronization Queue</h2>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Local IndexedDB event ledger for zero data-loss logistics
        </span>
      </div>

      {/* Connectivity Status Card */}
      <Card style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              backgroundColor: isOffline ? '#FEE2E2' : '#E8F5EE',
              color: isOffline ? '#DC2626' : '#025E4C',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {isOffline ? <WifiOff size={22} /> : <Wifi size={22} />}
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', margin: 0, fontWeight: 700 }}>
                {isOffline ? "You're Operating Offline" : 'Online Connection Active'}
              </h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {isOffline
                  ? 'All signatures and arrivals are safely preserved in device IndexedDB.'
                  : 'Ready to synchronize local events with central server.'}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Sync Queue List */}
      <Card title={`Local Pending Events (${queueItems.length})`}>
        {queueItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
            <CheckCircle2 size={36} color="var(--primary-green)" style={{ margin: '0 auto 0.5rem' }} />
            <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary)' }}>Sync Queue is Clear</p>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              All driver actions and manifests are completely up-to-date with central MongoDB.
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {queueItems.map((item) => (
              <div
                key={item.clientEventId}
                style={{
                  padding: '0.75rem 1rem',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: '#FFFFFF',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{item.eventType}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    ID: {item.clientEventId} • {new Date(item.clientTimestamp).toLocaleTimeString()}
                  </div>
                </div>
                <Badge status={item.status} />
              </div>
            ))}

            <button
              className="btn-primary driver-action-btn"
              onClick={handleManualSync}
              disabled={isOffline || loading || syncStatus === 'SYNCING'}
              style={{ marginTop: '1rem' }}
            >
              <RotateCcw size={18} />
              <span>{syncStatus === 'SYNCING' ? 'Synchronizing with Central Server...' : 'Synchronize Now'}</span>
            </button>
          </div>
        )}
      </Card>
    </div>
  );
};
