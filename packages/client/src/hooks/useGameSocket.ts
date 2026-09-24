import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { ClientEvents, ServerEvents } from '@clocktower/shared';
import { SERVER_URL } from '../api/config.js';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

export interface UseGameSocketResult {
  socket: Socket | null;
  status: ConnectionStatus;
}

/**
 * Connects to the game server, authenticates with the given token, and
 * automatically reconnects (Socket.IO's built-in backoff) re-sending auth
 * on every reconnect so the server can rebind the new connection id to the
 * existing player/storyteller identity.
 */
export function useGameSocket(token: string | null): UseGameSocketResult {
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const socketRef = useRef<Socket | null>(null);
  const [, forceRender] = useState(0);

  useEffect(() => {
    if (!token) return undefined;

    const socket = io(SERVER_URL || '/', {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 500,
      reconnectionDelayMax: 4000,
    });
    socketRef.current = socket;
    forceRender((n) => n + 1);

    const authenticate = () => {
      socket.emit(ClientEvents.Auth, { token });
    };

    socket.on('connect', () => {
      setStatus('connected');
      authenticate();
    });
    socket.on('disconnect', () => setStatus('disconnected'));
    socket.on('connect_error', () => setStatus('disconnected'));
    socket.on(ServerEvents.AuthOk, () => setStatus('connected'));

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  return { socket: socketRef.current, status };
}
