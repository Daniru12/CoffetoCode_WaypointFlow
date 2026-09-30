import { useState, useEffect } from 'react';
import { syncManager } from '../offline/syncManager';
import { syncQueue } from '../offline/syncQueue';

export const useSyncQueue = () => {
  const [pendingCount, setPendingCount] = useState(0);
  const [syncStatus, setSyncStatus] = useState('IDLE'); // IDLE, SYNCING, SYNCED, FAILED, CONFLICT

  const refreshCount = async () => {
    try {
      const items = await syncQueue.getPending();
      setPendingCount(items.length);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    refreshCount();

    const unsubscribe = syncManager.subscribe((update) => {
      if (update.status) setSyncStatus(update.status);
      if (update.pendingCount !== undefined) {
        setPendingCount(update.pendingCount);
      } else {
        refreshCount();
      }
    });

    return unsubscribe;
  }, []);

  const triggerSync = async () => {
    await syncManager.flushQueue();
    await refreshCount();
  };

  return {
    pendingCount,
    syncStatus,
    triggerSync,
    refreshCount
  };
};
