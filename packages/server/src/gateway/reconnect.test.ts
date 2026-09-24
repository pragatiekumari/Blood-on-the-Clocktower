import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Server as SocketIOServer } from 'socket.io';
import { io as ioClient, type Socket as ClientSocket } from 'socket.io-client';
import { ClientEvents, ServerEvents } from '@clocktower/shared';
import { SessionStore } from '../session/store.js';
import { registerGatewayHandlers } from './index.js';
import { createApp } from '../http/app.js';

async function waitFor<T = unknown>(socket: ClientSocket, event: string): Promise<T> {
  return new Promise((resolve) => {
    socket.once(event, (payload: T) => resolve(payload));
  });
}

describe('reconnect race condition', () => {
  let httpServer: ReturnType<typeof createServer>;
  let io: SocketIOServer;
  let baseUrl: string;
  let store: SessionStore;

  beforeAll(async () => {
    store = new SessionStore();
    const app = createApp(store);
    httpServer = createServer(app);
    io = new SocketIOServer(httpServer, { cors: { origin: '*' } });
    registerGatewayHandlers(io, store);
    await new Promise<void>((resolve) => httpServer.listen(0, resolve));
    const address = httpServer.address() as AddressInfo;
    baseUrl = `http://localhost:${address.port}`;
  });

  afterAll(async () => {
    io.close();
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  });

  it('does not mark a player disconnected when the OLD socket disconnects after a NEW socket already re-authenticated (page refresh)', async () => {
    const createRes = await fetch(`${baseUrl}/api/sessions`, { method: 'POST' });
    const { code } = (await createRes.json()) as { code: string };
    const joinRes = await fetch(`${baseUrl}/api/sessions/${code}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName: 'Alice' }),
    });
    const { playerId, playerToken } = (await joinRes.json()) as { playerId: string; playerToken: string };

    // Old socket (simulating the tab before refresh) authenticates first.
    const oldSocket = ioClient(baseUrl, { transports: ['websocket'] });
    await waitFor(oldSocket, 'connect');
    oldSocket.emit(ClientEvents.Auth, { token: playerToken });
    await waitFor(oldSocket, ServerEvents.AuthOk);

    // New socket (simulating the refreshed tab) authenticates with the same
    // token BEFORE the old socket's disconnect event is processed.
    const newSocket = ioClient(baseUrl, { transports: ['websocket'] });
    await waitFor(newSocket, 'connect');
    newSocket.emit(ClientEvents.Auth, { token: playerToken });
    await waitFor(newSocket, ServerEvents.AuthOk);

    // Now the old socket disconnects (its own 'disconnect' event fires on
    // the server), which must NOT clear the connection the new socket set.
    oldSocket.disconnect();

    // Give the server's disconnect handler a moment to run.
    await new Promise((r) => setTimeout(r, 100));

    const session = store.getSession(code)!;
    const player = session.players.get(playerId)!;
    expect(player.connectionId).toBe(newSocket.id);

    newSocket.disconnect();
  }, 10000);

  it('still correctly marks a player disconnected when their only/current socket disconnects', async () => {
    const createRes = await fetch(`${baseUrl}/api/sessions`, { method: 'POST' });
    const { code } = (await createRes.json()) as { code: string };
    const joinRes = await fetch(`${baseUrl}/api/sessions/${code}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName: 'Bob' }),
    });
    const { playerId, playerToken } = (await joinRes.json()) as { playerId: string; playerToken: string };

    const socket = ioClient(baseUrl, { transports: ['websocket'] });
    await waitFor(socket, 'connect');
    socket.emit(ClientEvents.Auth, { token: playerToken });
    await waitFor(socket, ServerEvents.AuthOk);

    socket.disconnect();
    await new Promise((r) => setTimeout(r, 100));

    const session = store.getSession(code)!;
    const player = session.players.get(playerId)!;
    expect(player.connectionId).toBeNull();
  }, 10000);
});
