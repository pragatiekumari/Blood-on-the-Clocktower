import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { ClientEvents, ServerEvents } from '@clocktower/shared';
import { SERVER_URL } from '../api/config.js';

export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

export interface UseGameSocketResult {
  socket: Socket | null;
  status: ConnectionStatus;
}

const KEEP_ALIVE_INTERVAL_MS = 20_000;

/**
 * Connects to the game server, authenticates with the given token, and
 * automatically reconnects (Socket.IO's built-in backoff) re-sending auth
 * on every reconnect so the server can rebind the new connection id to the
 * existing player/storyteller identity.
 *
 * Uses websocket with a polling fallback: some proxies/networks between the
 * browser and the server (common on free hosting tiers) don't reliably hold
 * long-lived WebSocket connections open, which otherwise shows up as the
 * whole screen silently "refreshing" whenever Socket.IO reconnects in the
 * background. A lightweight periodic ping also keeps the connection warm so
 * the host's idle-timeout doesn't tear it down during a quiet stretch.
 */
export function useGameSocket(token: string | null): UseGameSocketResult {
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const socketRef = useRef<Socket | null>(null);
  const [, forceRender] = useState(0);

  useEffect(() => {
    if (!token) return undefined;

    const socket = io(SERVER_URL || '/', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 500,
      reconnectionDelayMax: 4000,
    });
    socketRef.current = socket;
    forceRender((n) => n + 1);

    let hasConnectedOnce = false;

    const authenticate = () => {
      socket.emit(ClientEvents.Auth, { token });
    };

    socket.on('connect', () => {
      setStatus(hasConnectedOnce ? 'connected' : 'connecting');
      authenticate();
    });
    socket.on(ServerEvents.AuthOk, () => {
      hasConnectedOnce = true;
      setStatus('connected');
    });
    socket.on('disconnect', () => setStatus('reconnecting'));
    socket.on('connect_error', () => setStatus(hasConnectedOnce ? 'reconnecting' : 'disconnected'));
    socket.io.on('reconnect_attempt', () => setStatus('reconnecting'));

    const keepAlive = setInterval(() => {
      if (socket.connected) socket.emit('ping');
    }, KEEP_ALIVE_INTERVAL_MS);

    return () => {
      clearInterval(keepAlive);
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  return { socket: socketRef.current, status };
}
