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

describe('gateway error resilience', () => {
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

  it('emits a scoped error for a malformed event and keeps the session usable afterwards', async () => {
    const createRes = await fetch(`${baseUrl}/api/sessions`, { method: 'POST' });
    const { code, storytellerToken } = (await createRes.json()) as { code: string; storytellerToken: string };
    const joinRes = await fetch(`${baseUrl}/api/sessions/${code}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName: 'Alice' }),
    });
    const { playerToken } = (await joinRes.json()) as { playerToken: string };

    const stSocket = ioClient(baseUrl, { transports: ['websocket'] });
    await waitFor(stSocket, 'connect');
    stSocket.emit(ClientEvents.Auth, { token: storytellerToken });
    await waitFor(stSocket, ServerEvents.AuthOk);

    const playerSocket = ioClient(baseUrl, { transports: ['websocket'] });
    await waitFor(playerSocket, 'connect');
    playerSocket.emit(ClientEvents.Auth, { token: playerToken });
    await waitFor(playerSocket, ServerEvents.AuthOk);

    // Send a malformed nominate payload (missing required field).
    const errorPromise = waitFor<{ code: string; message: string }>(playerSocket, ServerEvents.Error);
    playerSocket.emit(ClientEvents.PlayerNominate, { wrongField: 'nonsense' });
    const errorPayload = await errorPromise;
    expect(typeof errorPayload.code).toBe('string');
    expect(typeof errorPayload.message).toBe('string');

    // A non-storyteller attempting a storyteller-only action gets a scoped error, not a crash.
    const notStorytellerPromise = waitFor<{ code: string }>(playerSocket, ServerEvents.Error);
    playerSocket.emit(ClientEvents.StorytellerStartDistribution);
    const notStorytellerError = await notStorytellerPromise;
    expect(notStorytellerError.code).toBe('NOT_STORYTELLER');

    // The session must still be fully usable afterwards: a valid action from the Storyteller succeeds.
    const distributedPromise = waitFor(stSocket, ServerEvents.GameDistributed);
    // Need at least MIN_PLAYERS; join more players quickly via REST then have them authenticate.
    const extraSockets: ClientSocket[] = [];
    for (let i = 0; i < 4; i++) {
      const r = await fetch(`${baseUrl}/api/sessions/${code}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: `Extra${i}` }),
      });
      const { playerToken: extraToken } = (await r.json()) as { playerToken: string };
      const s = ioClient(baseUrl, { transports: ['websocket'] });
      await waitFor(s, 'connect');
      s.emit(ClientEvents.Auth, { token: extraToken });
      await waitFor(s, ServerEvents.AuthOk);
      extraSockets.push(s);
    }

    stSocket.emit(ClientEvents.StorytellerStartDistribution);
    await distributedPromise;

    stSocket.disconnect();
    playerSocket.disconnect();
    for (const s of extraSockets) s.disconnect();
  }, 15000);
});
