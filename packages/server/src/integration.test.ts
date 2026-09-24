import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Server as SocketIOServer } from 'socket.io';
import { io as ioClient, type Socket as ClientSocket } from 'socket.io-client';
import { ClientEvents, MIN_PLAYERS, ServerEvents } from '@clocktower/shared';
import { SessionStore } from './session/store.js';
import { registerGatewayHandlers } from './gateway/index.js';
import { createApp } from './http/app.js';

async function waitFor<T = unknown>(socket: ClientSocket, event: string): Promise<T> {
  return new Promise((resolve) => {
    socket.once(event, (payload: T) => resolve(payload));
  });
}

describe('full game flow integration', () => {
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

  it('runs create -> join -> distribute -> vote -> execute -> evil chat, with info hiding enforced', async () => {
    // 1. Create session as Storyteller.
    const createRes = await fetch(`${baseUrl}/api/sessions`, { method: 'POST' });
    expect(createRes.status).toBe(201);
    const { code, storytellerToken } = (await createRes.json()) as { code: string; storytellerToken: string };

    // 2. Join MIN_PLAYERS players.
    const playerTokens: { playerId: string; playerToken: string }[] = [];
    for (let i = 0; i < MIN_PLAYERS; i++) {
      const joinRes = await fetch(`${baseUrl}/api/sessions/${code}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: `Player${i}` }),
      });
      expect(joinRes.status).toBe(201);
      const body = (await joinRes.json()) as { playerId: string; playerToken: string };
      playerTokens.push(body);
    }

    // 3. Connect sockets and authenticate.
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

    // 4. Start distribution; assert Storyteller gets the full Grimoire and each player gets only their own data.
    const distributedPromises = playerSockets.map((s) => waitFor<any>(s, ServerEvents.GameDistributed));
    const stDistributedPromise = waitFor<any>(stSocket, ServerEvents.GameDistributed);
    stSocket.emit(ClientEvents.StorytellerStartDistribution);

    const stPayload = await stDistributedPromise;
    expect(stPayload.role).toBe('storyteller');
    expect(stPayload.grimoire).toHaveLength(MIN_PLAYERS);
    for (const entry of stPayload.grimoire) {
      expect(entry.character).not.toBeNull();
    }

    const playerPayloads = await Promise.all(distributedPromises);
    for (const payload of playerPayloads) {
      expect(payload.role).toBe('player');
      expect(typeof payload.character).toBe('string');
      // A good player's payload must never carry other players' identities.
      if (payload.alignment === 'good') {
        expect(payload.teammates).toBeUndefined();
        expect(payload.bluff).toBeUndefined();
      } else {
        expect(Array.isArray(payload.teammates)).toBe(true);
        expect(payload.bluff).toBeDefined();
        expect(typeof payload.bluff.id).toBe('string');
      }
    }

    // 5. Full nominate -> vote -> close -> confirm execution flow.
    const session = store.getSession(code)!;
    const players = [...session.players.keys()];
    const nominatorSocket = playerSockets[0]!;
    const targetId = players[1]!;

    const openedPromise = waitFor<any>(stSocket, ServerEvents.NominationOpened);
    nominatorSocket.emit(ClientEvents.PlayerNominate, { targetPlayerId: targetId });
    const opened = await openedPromise;
    expect(opened.targetId).toBe(targetId);

    // Cast enough yes-votes to meet the 50% threshold (ceil(5/2) = 3).
    for (let i = 0; i < 3; i++) {
      const voteUpdatePromise = waitFor<any>(stSocket, ServerEvents.NominationVoteUpdate);
      playerSockets[i]!.emit(ClientEvents.PlayerVote, { nominationId: opened.nominationId, voting: true });
      await voteUpdatePromise;
    }

    const closedPromise = waitFor<any>(stSocket, ServerEvents.NominationClosed);
    stSocket.emit(ClientEvents.StorytellerCloseVote, { nominationId: opened.nominationId });
    const closed = await closedPromise;
    expect(closed.pendingExecution).toBe(true);

    const executedPromise = waitFor<any>(stSocket, ServerEvents.ExecutionConfirmed);
    stSocket.emit(ClientEvents.StorytellerConfirmExecution, { nominationId: opened.nominationId });
    const executed = await executedPromise;
    expect(executed.playerId).toBe(targetId);
    expect(session.players.get(targetId)!.alive).toBe(false);

    // 6. Evil chat: only evil-aligned player sockets + Storyteller receive it.
    const evilPlayerIds = new Set(evilPlayerIdsOf(session));
    const evilSocketIndexes = players
      .map((id, idx) => ({ id, idx }))
      .filter(({ id }) => evilPlayerIds.has(id))
      .map(({ idx }) => idx);

    expect(evilSocketIndexes.length).toBeGreaterThan(0);
    const evilSenderIdx = evilSocketIndexes[0]!;
    const goodIdx = players.findIndex((id) => !evilPlayerIds.has(id));

    const receivers: Promise<any>[] = [];
    const goodSocket = playerSockets[goodIdx]!;
    let goodReceived = false;
    goodSocket.once(ServerEvents.ChatEvilMessage, () => {
      goodReceived = true;
    });
    for (const idx of evilSocketIndexes) {
      if (idx !== evilSenderIdx) {
        receivers.push(waitFor<any>(playerSockets[idx]!, ServerEvents.ChatEvilMessage));
      }
    }
    const stChatPromise = waitFor<any>(stSocket, ServerEvents.ChatEvilMessage);

    playerSockets[evilSenderIdx]!.emit(ClientEvents.ChatEvilSend, { text: 'hello fellow evil' });

    await Promise.all(receivers);
    await stChatPromise;
    await new Promise((r) => setTimeout(r, 50));
    expect(goodReceived).toBe(false);

    stSocket.disconnect();
    for (const s of playerSockets) s.disconnect();
  }, 20000);
});

function evilPlayerIdsOf(session: ReturnType<SessionStore['createSession']>): string[] {
  const ids: string[] = [];
  for (const p of session.players.values()) {
    if (p.alignment === 'evil') ids.push(p.playerId);
  }
  return ids;
}
