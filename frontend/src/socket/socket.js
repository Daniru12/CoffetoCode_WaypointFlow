import { io } from 'socket.io-client';

const RAW_URL = import.meta.env.VITE_SOCKET_URL || (window.location.origin.includes(':5173') ? 'http://localhost:5000' : window.location.origin);
const IS_VERCEL = RAW_URL.includes('vercel.app') || window.location.origin.includes('vercel.app');

class ServerlessSocketFallback {
  constructor() {
    this.handlers = new Map();
    this.connected = true;
    this.id = `serverless-${Math.random().toString(36).substring(2, 9)}`;

    console.info('ℹ️ WaypointFlow: Running in serverless mode. Background periodic sync active (no 404s).');

    // Periodically notify listeners to refresh views (Dashboard, Jobs, Fleet)
    this.syncInterval = setInterval(() => {
      const syncEvents = [
        'order.created',
        'plan.published',
        'delivery.completed',
        'loading.completed',
        'vehicle.breakdown'
      ];
      syncEvents.forEach((evt) => this.trigger(evt, { timestamp: new Date().toISOString(), serverless: true }));
    }, 15000);
  }

  on(event, callback) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event).push(callback);

    if (event === 'connect' && this.connected) {
      setTimeout(() => callback(), 0);
    }
    return this;
  }

  off(event, callback) {
    if (!this.handlers.has(event)) return this;
    if (!callback) {
      this.handlers.delete(event);
      return this;
    }
    const filtered = this.handlers.get(event).filter((cb) => cb !== callback);
    this.handlers.set(event, filtered);
    return this;
  }

  trigger(event, data) {
    const callbacks = this.handlers.get(event) || [];
    callbacks.forEach((cb) => {
      try {
        cb(data);
      } catch (err) {
        console.warn(`[SocketFallback Error in ${event}]:`, err);
      }
    });
  }

  emit() {
    // Client-side emit placeholder for serverless mode
  }

  disconnect() {
    if (this.syncInterval) clearInterval(this.syncInterval);
    this.connected = false;
    this.trigger('disconnect');
  }
}

let socket = null;

export const getSocket = () => {
  if (!socket) {
    // If deployed on Vercel, don't attempt Socket.IO polling to prevent 404 network errors
    if (IS_VERCEL && !import.meta.env.VITE_FORCE_SOCKET_IO) {
      socket = new ServerlessSocketFallback();
    } else {
      try {
        socket = io(RAW_URL, {
          autoConnect: true,
          reconnection: true,
          reconnectionAttempts: 3,
          reconnectionDelay: 5000,
          transports: ['websocket', 'polling']
        });

        socket.on('connect', () => {
          console.log('⚡ Socket connected to WaypointFlow server:', socket.id);
        });

        socket.on('connect_error', (error) => {
          console.warn('⚠️ Socket.IO connection failed (likely serverless deployment). Switching to fallback sync.');
          // Avoid spamming 404s
          socket.disconnect();
          socket = new ServerlessSocketFallback();
        });

        socket.on('disconnect', (reason) => {
          console.log('🔌 Socket disconnected:', reason);
        });
      } catch (err) {
        console.warn('⚠️ Socket initialization error, falling back:', err);
        socket = new ServerlessSocketFallback();
      }
    }
  }

  return socket;
};
