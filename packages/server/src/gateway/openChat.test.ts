import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Server as SocketIOServer } from 'socket.io';
import { io as ioClient, type Socket as ClientSocket } from 'socket.io-client';
import { ClientEvents, MIN_PLAYERS, ServerEvents } from '@clocktower/shared';
import { SessionStore } from '../session/store.js';
import { registerGatewayHandlers } from './index.js';
import { createApp } from '../http/app.js';

async function waitFor<T = unknown>(socket: ClientSocket, event: string): Promise<T> {
  return new Promise((resolve) => {
    socket.once(event, (payload: T) => resolve(payload));
  });
}

describe('Open Discussion chat', () => {
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

  it('broadcasts a player message to every player and the Storyteller, and replays history to late joiners', async () => {
    const createRes = await fetch(`${baseUrl}/api/sessions`, { method: 'POST' });
    const { code, storytellerToken } = (await createRes.json()) as { code: string; storytellerToken: string };

    const playerTokens: { playerId: string; playerToken: string }[] = [];
    for (let i = 0; i < MIN_PLAYERS; i++) {
      const joinRes = await fetch(`${baseUrl}/api/sessions/${code}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: `Player${i}` }),
      });
      const body = (await joinRes.json()) as { playerId: string; playerToken: string };
      playerTokens.push(body);
    }

    const stSocket = ioClient(baseUrl, { transports: ['websocket'] });
    await waitFor(stSocket, 'connect');
    stSocket.emit(ClientEvents.Auth, { token: storytellerToken });
    await waitFor(stSocket, ServerEvents.AuthOk);

    const playerSockets: ClientSocket[] = [];
    for (const { playerToken } of playerTokens) {
      const s = ioClient(baseUrl, { transports: ['websocket'] });
      await waitFor(s, 'connect');
      s.emit(ClientEvents.Auth, { token: playerToken });
      await waitFor(s, ServerEvents.AuthOk);
      playerSockets.push(s);
    }

    // Every player (except the sender) and the Storyteller should receive the message.
    const receiverSockets = [stSocket, ...playerSockets.slice(1)];
    const receivedPromises = receiverSockets.map((s) => waitFor<any>(s, ServerEvents.ChatOpenMessage));

    playerSockets[0]!.emit(ClientEvents.ChatOpenSend, { text: 'hello everyone' });

    const received = await Promise.all(receivedPromises);
    for (const message of received) {
      expect(message.text).toBe('hello everyone');
      expect(message.senderName).toBe('Player0');
    }

    // A late joiner (or reconnecting client) gets the full history on auth, not just live messages.
    const joinRes = await fetch(`${baseUrl}/api/sessions/${code}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName: 'LateJoiner' }),
    });
    const { playerToken: lateToken } = (await joinRes.json()) as { playerToken: string };
    const lateSocket = ioClient(baseUrl, { transports: ['websocket'] });
    await waitFor(lateSocket, 'connect');
    const historyPromise = waitFor<any>(lateSocket, ServerEvents.ChatOpenHistory);
    lateSocket.emit(ClientEvents.Auth, { token: lateToken });
    const history = await historyPromise;
    expect(history.messages).toHaveLength(1);
    expect(history.messages[0].text).toBe('hello everyone');

    // The Storyteller can speak in Open Discussion too, labeled "Storyteller".
    const stMessagePromise = waitFor<any>(playerSockets[0]!, ServerEvents.ChatOpenMessage);
    stSocket.emit(ClientEvents.ChatOpenSend, { text: 'good evening, town' });
    const stMessage = await stMessagePromise;
    expect(stMessage.senderName).toBe('Storyteller');
    expect(stMessage.text).toBe('good evening, town');

    stSocket.disconnect();
    lateSocket.disconnect();
    for (const s of playerSockets) s.disconnect();
  }, 20000);
});
