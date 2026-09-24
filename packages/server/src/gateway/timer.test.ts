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

describe('phase timer', () => {
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

  async function setupSessionAtDay(): Promise<{ code: string; stSocket: ClientSocket }> {
    const createRes = await fetch(`${baseUrl}/api/sessions`, { method: 'POST' });
    const { code, storytellerToken } = (await createRes.json()) as { code: string; storytellerToken: string };
    for (let i = 0; i < MIN_PLAYERS; i++) {
      await fetch(`${baseUrl}/api/sessions/${code}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: `P${i}` }),
      });
    }
    const stSocket = ioClient(baseUrl, { transports: ['websocket'] });
    await waitFor(stSocket, 'connect');
    stSocket.emit(ClientEvents.Auth, { token: storytellerToken });
    await waitFor(stSocket, ServerEvents.AuthOk);
    const distributedPromise = waitFor(stSocket, ServerEvents.GameDistributed);
    stSocket.emit(ClientEvents.StorytellerStartDistribution);
    await distributedPromise;
    return { code, stSocket };
  }

  /** Waits for a GamePhaseChanged event whose payload satisfies `predicate`, ignoring earlier unrelated broadcasts (e.g. distribution's own day-phase announcement) still in flight. */
  async function waitForPhaseChanged(
    socket: ClientSocket,
    predicate: (payload: { phase: string; dayNumber: number; phaseEndsAt: number | null }) => boolean
  ): Promise<{ phase: string; dayNumber: number; phaseEndsAt: number | null }> {
    return new Promise((resolve) => {
      const handler = (payload: { phase: string; dayNumber: number; phaseEndsAt: number | null }) => {
        if (predicate(payload)) {
          socket.off(ServerEvents.GamePhaseChanged, handler);
          resolve(payload);
        }
      };
      socket.on(ServerEvents.GamePhaseChanged, handler);
    });
  }

  it('includes a phaseEndsAt timestamp when switching phase with a timerSeconds value', async () => {
    const { stSocket } = await setupSessionAtDay();

    const before = Date.now();
    const phaseChangedPromise = waitForPhaseChanged(stSocket, (p) => p.phase === 'night');
    stSocket.emit(ClientEvents.StorytellerSetPhase, { phase: 'night', timerSeconds: 60 });
    const payload = await phaseChangedPromise;

    expect(payload.phase).toBe('night');
    expect(payload.phaseEndsAt).not.toBeNull();
    expect(payload.phaseEndsAt!).toBeGreaterThanOrEqual(before + 59_000);
    expect(payload.phaseEndsAt!).toBeLessThanOrEqual(before + 61_000);

    stSocket.disconnect();
  }, 10000);

  it('omits the timer (phaseEndsAt null) when no timerSeconds is given', async () => {
    const { stSocket } = await setupSessionAtDay();

    const phaseChangedPromise = waitForPhaseChanged(stSocket, (p) => p.phase === 'night');
    stSocket.emit(ClientEvents.StorytellerSetPhase, { phase: 'night' });
    const payload = await phaseChangedPromise;

    expect(payload.phaseEndsAt).toBeNull();
    stSocket.disconnect();
  }, 10000);

  it('storyteller:setTimer updates or clears the timer independent of phase changes', async () => {
    const { stSocket } = await setupSessionAtDay();

    const setPromise = waitForPhaseChanged(stSocket, (p) => p.phaseEndsAt !== null);
    stSocket.emit(ClientEvents.StorytellerSetTimer, { timerSeconds: 30 });
    const setPayload = await setPromise;
    expect(setPayload.phaseEndsAt).not.toBeNull();

    const clearPromise = waitForPhaseChanged(stSocket, (p) => p.phaseEndsAt === null);
    stSocket.emit(ClientEvents.StorytellerSetTimer, { timerSeconds: null });
    const clearPayload = await clearPromise;
    expect(clearPayload.phaseEndsAt).toBeNull();

    stSocket.disconnect();
  }, 10000);

  it('rejects storyteller:setTimer from a non-Storyteller socket', async () => {
    const createRes = await fetch(`${baseUrl}/api/sessions`, { method: 'POST' });
    const { code } = (await createRes.json()) as { code: string };
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
    playerSocket.emit(ClientEvents.StorytellerSetTimer, { timerSeconds: 30 });
    const error = await errorPromise;
    expect(error.code).toBe('NOT_STORYTELLER');

    playerSocket.disconnect();
  }, 10000);
});
