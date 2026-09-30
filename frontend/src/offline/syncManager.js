import { syncQueue } from './syncQueue';
import { syncApi } from '../api/sync.api';
import { getDB } from './db';

class SyncManager {
  constructor() {
    this.isSyncing = false;
    this.listeners = new Set();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify(data) {
    this.listeners.forEach((fn) => fn(data));
  }

  /**
   * Cache bootstrap route data from server into IndexedDB
   */
  async cacheRouteData(data) {
    const db = await getDB();
    if (data.trips && Array.isArray(data.trips)) {
      const tx = db.transaction('cachedRoutes', 'readwrite');
      for (const trip of data.trips) {
        await tx.store.put(trip);
      }
      await tx.done;
    }

    if (data.deliveries && Array.isArray(data.deliveries)) {
      const tx = db.transaction('cachedDeliveries', 'readwrite');
      for (const del of data.deliveries) {
        await tx.store.put(del);
      }
      await tx.done;
    }
  }

  /**
   * Load cached route data from IndexedDB
   */
  async getCachedRoutes() {
    const db = await getDB();
    const trips = await db.getAll('cachedRoutes');
    const deliveries = await db.getAll('cachedDeliveries');
    return { trips, deliveries };
  }

  /**
   * Trigger synchronization of all pending offline events to backend
   */
  async flushQueue() {
    if (this.isSyncing || !navigator.onLine) return;
    this.isSyncing = true;
    this.notify({ status: 'SYNCING' });

    try {
      const pendingEvents = await syncQueue.getPending();
      if (pendingEvents.length === 0) {
        this.isSyncing = false;
        this.notify({ status: 'IDLE', pendingCount: 0 });
        return;
      }

      const res = await syncApi.syncEvents({
        deviceId: navigator.userAgent || 'DRIVER_MOBILE_DEVICE',
        events: pendingEvents
      });

      // Mark synced items
      if (res.data?.processed) {
        for (const item of res.data.processed) {
          if (item.status === 'SYNCED') {
            await syncQueue.markSynced(item.clientEventId);
          }
        }
      }

      const remaining = await syncQueue.getPending();
      this.notify({
        status: remaining.length === 0 ? 'SYNCED' : 'CONFLICT',
        pendingCount: remaining.length
      });
    } catch (err) {
      console.warn('Sync flush error:', err.message);
      this.notify({ status: 'FAILED', error: err.message });
    } finally {
      this.isSyncing = false;
    }
  }
}

export const syncManager = new SyncManager();
