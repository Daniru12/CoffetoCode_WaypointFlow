import React from 'react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Database, RefreshCw, CheckCircle, Clock, Trash2 } from 'lucide-react';

export const SyncQueue = ({
  items = [],
  onSyncAll,
  onClear,
  isSyncing = false
}) => {
  return (
    <Card
      title="Offline Sync Queue"
      subtitle={`${items.length} events staged locally on device IndexedDB`}
      action={
        items.length > 0 && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={onSyncAll}
              disabled={isSyncing || !navigator.onLine}
              className="btn-primary"
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
            >
              <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
            </button>
            {onClear && (
              <button
                onClick={onClear}
                className="btn-secondary"
                style={{ padding: '0.35rem 0.5rem', color: 'var(--error)' }}
                title="Clear queue"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        )
      }
    >
      {items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          <CheckCircle size={32} color="var(--primary-green)" style={{ margin: '0 auto 0.5rem' }} />
          <div>All local updates are synced with the central WaypointFlow server.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {items.map((item, idx) => (
            <div
              key={item.clientEventId || idx}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.65rem 0.85rem',
                backgroundColor: '#F8FAFC',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8rem'
              }}
            >
              <div>
                <div style={{ fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Database size={13} color="var(--primary-green)" />
                  <span>{item.eventType}</span>
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '0.15rem' }}>
                  Target ID: {item.entityId} • {new Date(item.timestamp).toLocaleTimeString()}
                </div>
              </div>
              <Badge status={item.status || 'PENDING'} />
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};
