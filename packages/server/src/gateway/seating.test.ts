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

describe('seat reordering', () => {
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

  it('broadcasts the new seat order to lobby and grimoire after the Storyteller reorders seats', async () => {
    const createRes = await fetch(`${baseUrl}/api/sessions`, { method: 'POST' });
    const { code, storytellerToken } = (await createRes.json()) as { code: string; storytellerToken: string };

    const playerIds: string[] = [];
    for (let i = 0; i < 3; i++) {
      const joinRes = await fetch(`${baseUrl}/api/sessions/${code}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: `Player${i}` }),
      });
      const body = (await joinRes.json()) as { playerId: string };
      playerIds.push(body.playerId);
    }

    const stSocket = ioClient(baseUrl, { transports: ['websocket'] });
    await waitFor(stSocket, 'connect');
    stSocket.emit(ClientEvents.Auth, { token: storytellerToken });
    await waitFor(stSocket, ServerEvents.AuthOk);

    const [a, b, c] = playerIds;

    const lobbyUpdate = await new Promise<{ players: { playerId: string; seatIndex: number }[] }>((resolve) => {
      const handler = (payload: { players: { playerId: string; seatIndex: number }[] }) => {
        const bySeat = [...payload.players].sort((x, y) => x.seatIndex - y.seatIndex);
        if (bySeat.map((p) => p.playerId).join(',') === [c, a, b].join(',')) {
          stSocket.off(ServerEvents.LobbyUpdate, handler);
          resolve(payload);
        }
      };
      stSocket.on(ServerEvents.LobbyUpdate, handler);
      stSocket.emit(ClientEvents.StorytellerReorderSeats, { orderedPlayerIds: [c, a, b] });
    });

    const bySeat = [...lobbyUpdate.players].sort((x, y) => x.seatIndex - y.seatIndex);
    expect(bySeat.map((p) => p.playerId)).toEqual([c, a, b]);

    stSocket.disconnect();
  }, 10000);

  it('rejects seat reordering from a non-Storyteller socket', async () => {
    const createRes = await fetch(`${baseUrl}/api/sessions`, { method: 'POST' });
    const { code } = (await createRes.json()) as { code: string; storytellerToken: string };
    const joinRes = await fetch(`${baseUrl}/api/sessions/${code}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName: 'Solo' }),
    });
    const { playerToken } = (await joinRes.json()) as { playerToken: string };

    const playerSocket = ioClient(baseUrl, { transports: ['websocket'] });
    await waitFor(playerSocket, 'connect');
    playerSocket.emit(ClientEvents.Auth, { token: playerToken });
    await waitFor(playerSocket, ServerEvents.AuthOk);

    const errorPromise = waitFor<{ code: string }>(playerSocket, ServerEvents.Error);
    playerSocket.emit(ClientEvents.StorytellerReorderSeats, { orderedPlayerIds: ['x', 'y'] });
    const error = await errorPromise;
    expect(error.code).toBe('NOT_STORYTELLER');

    playerSocket.disconnect();
  }, 10000);
});
