import { useEffect, useState, useRef } from 'react';
import { socket } from '../services/socket';

// Reference counter to track active listeners/components using the socket connection
let activeConnections = 0;

/**
 * Custom React Hook to manage Socket.IO connection lifecycle,
 * connection state tracking, automatic reconnections, and event listeners.
 * 
 * @param {Object} callbacks - Object containing event callbacks
 * @param {Function} callbacks.onQueueUpdated - Fired when the queue state updates
 * @param {Function} callbacks.onCurrentTokenUpdated - Fired when a new token is called
 */
export default function useQueueSocket(callbacks = {}) {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  // Keep callback references fresh without triggering effect re-runs
  const callbacksRef = useRef(callbacks);
  useEffect(() => {
    callbacksRef.current = callbacks;
  });

  useEffect(() => {
    activeConnections++;
    // Connect socket on first subscriber
    if (activeConnections === 1 && !socket.connected) {
      socket.connect();
    }

    // Update state when connected
    const handleConnect = () => {
      console.log('Real-time sync established.');
      setIsConnected(true);
      setReconnectAttempts(0);
    };

    // Update state when disconnected
    const handleDisconnect = (reason) => {
      console.warn(`Real-time sync disconnected: ${reason}`);
      setIsConnected(false);
    };

    // Track connection errors
    const handleConnectError = (error) => {
      console.error('Real-time connection error:', error.message);
      setIsConnected(false);
    };

    // Track reconnection attempts
    const handleReconnectAttempt = (attempt) => {
      console.log(`Attempting to reconnect: ${attempt}...`);
      setReconnectAttempts(attempt);
    };

    // Event delegates using current callback refs
    const handleQueueUpdated = (...args) => {
      if (callbacksRef.current.onQueueUpdated) {
        callbacksRef.current.onQueueUpdated(...args);
      }
    };

    const handleCurrentTokenUpdated = (...args) => {
      if (callbacksRef.current.onCurrentTokenUpdated) {
        callbacksRef.current.onCurrentTokenUpdated(...args);
      }
    };

    // Bind connection events
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on('reconnect_attempt', handleReconnectAttempt);
    socket.on('queueUpdated', handleQueueUpdated);
    socket.on('currentTokenUpdated', handleCurrentTokenUpdated);

    // Cleanup listeners and disconnect when all subscribers unmount
    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.off('reconnect_attempt', handleReconnectAttempt);
      socket.off('queueUpdated', handleQueueUpdated);
      socket.off('currentTokenUpdated', handleCurrentTokenUpdated);
      
      activeConnections--;
      if (activeConnections <= 0) {
        socket.disconnect();
      }
    };
  }, []); // Run once on component mount

  return { isConnected, reconnectAttempts };
}
