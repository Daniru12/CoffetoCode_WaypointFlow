import { getDB } from './db';

export const syncQueue = {
  /**
   * Enqueue an event to IndexedDB syncQueue
   */
  async enqueue(eventType, entityId, payload = {}, entityType = 'Delivery') {
    const db = await getDB();
    const clientEventId = `evt-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const event = {
      clientEventId,
      eventType,
      entityType,
      entityId,
      payload,
      clientTimestamp: new Date().toISOString(),
      status: 'PENDING'
    };

    await db.put('syncQueue', event);
    return event;
  },

  /**
   * Get all pending events from the queue
   */
  async getPending() {
    const db = await getDB();
    const all = await db.getAll('syncQueue');
    return all.filter((e) => e.status === 'PENDING' || e.status === 'FAILED');
  },

  /**
   * Mark event as synced or delete from queue
   */
  async markSynced(clientEventId) {
    const db = await getDB();
    await db.delete('syncQueue', clientEventId);
  },

  /**
   * Clear sync queue
   */
  async clear() {
    const db = await getDB();
    await db.clear('syncQueue');
  }
};
