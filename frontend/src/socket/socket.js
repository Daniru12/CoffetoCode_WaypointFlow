import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || (window.location.origin.includes(':5173') ? 'http://localhost:5000' : window.location.origin);

let socket = null;

export const getSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000
    });

    socket.on('connect', () => {
      console.log('⚡ Socket connected to WaypointFlow server:', socket.id);
    });

    socket.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
    });
  }

  return socket;
};
