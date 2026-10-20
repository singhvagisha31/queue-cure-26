import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

// Initialize the Socket.IO client connection with robust auto-reconnection parameters
export const socket = io(SOCKET_URL, {
  autoConnect: false, // Let the custom React hook manage connection lifecycle
  reconnection: true, // Enable automatic reconnection
  reconnectionAttempts: Infinity, // Keep retrying reconnection indefinitely
  reconnectionDelay: 1000, // Initial delay before reconnection attempt (1s)
  reconnectionDelayMax: 5000, // Maximum delay between reconnection attempts (5s)
  randomizationFactor: 0.5, // Randomize attempts to prevent thundering herd
  timeout: 20000, // Connection timeout threshold (20s)
  withCredentials: true
});
