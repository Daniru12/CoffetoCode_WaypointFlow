import { openDB } from 'idb';

const DB_NAME = 'waypointflow_offline_db';
const DB_VERSION = 1;

export const initDB = async () => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('cachedRoutes')) {
        db.createObjectStore('cachedRoutes', { keyPath: '_id' });
      }
      if (!db.objectStoreNames.contains('cachedDeliveries')) {
        const delStore = db.createObjectStore('cachedDeliveries', { keyPath: '_id' });
        delStore.createIndex('trip', 'trip');
      }
      if (!db.objectStoreNames.contains('syncQueue')) {
        const queueStore = db.createObjectStore('syncQueue', { keyPath: 'clientEventId' });
        queueStore.createIndex('status', 'status');
      }
      if (!db.objectStoreNames.contains('appState')) {
        db.createObjectStore('appState', { keyPath: 'key' });
      }
    }
  });
};

export const getDB = async () => {
  return initDB();
};
