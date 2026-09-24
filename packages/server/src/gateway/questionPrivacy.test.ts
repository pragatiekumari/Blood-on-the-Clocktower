import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Server as SocketIOServer } from 'socket.io';
import { io as ioClient, type Socket as ClientSocket } from 'socket.io-client';
import { ClientEvents, MIN_PLAYERS, ServerEvents, type QuestionEntryView } from '@clocktower/shared';
import { SessionStore } from '../session/store.js';
import { registerGatewayHandlers } from './index.js';
import { createApp } from '../http/app.js';

async function waitFor<T = unknown>(socket: ClientSocket, event: string): Promise<T> {
  return new Promise((resolve) => {
    socket.once(event, (payload: T) => resolve(payload));
  });
}

describe('question queue privacy', () => {
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

  it('never sends a player another player\'s question or answer, only their own', async () => {
    const createRes = await fetch(`${baseUrl}/api/sessions`, { method: 'POST' });
    const { code, storytellerToken } = (await createRes.json()) as { code: string; storytellerToken: string };

    const playerSockets: ClientSocket[] = [];
    const playerIds: string[] = [];
    for (let i = 0; i < MIN_PLAYERS; i++) {
      const joinRes = await fetch(`${baseUrl}/api/sessions/${code}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: `P${i}` }),
      });
      const { playerId, playerToken } = (await joinRes.json()) as { playerId: string; playerToken: string };
      playerIds.push(playerId);
      const s = ioClient(baseUrl, { transports: ['websocket'] });
      await waitFor(s, 'connect');
      s.emit(ClientEvents.Auth, { token: playerToken });
      await waitFor(s, ServerEvents.AuthOk);
      playerSockets.push(s);
    }

    const stSocket = ioClient(baseUrl, { transports: ['websocket'] });
    await waitFor(stSocket, 'connect');
    stSocket.emit(ClientEvents.Auth, { token: storytellerToken });
    await waitFor(stSocket, ServerEvents.AuthOk);

    const distributedPromise = waitFor(stSocket, ServerEvents.GameDistributed);
    stSocket.emit(ClientEvents.StorytellerStartDistribution);
    await distributedPromise;

    // Player 0 asks a question. Player 1 must never see it, even though the
    // Storyteller does. Capture every QuestionQueueUpdate player 1 receives
    // during this whole exchange (there should be none containing player 0's
    // question).
    const player1Received: QuestionEntryView[][] = [];
    playerSockets[1]!.on(ServerEvents.QuestionQueueUpdate, (payload: { questions: QuestionEntryView[] }) => {
      player1Received.push(payload.questions);
    });

    const player0QueuePromise = waitFor<{ questions: QuestionEntryView[] }>(
      playerSockets[0]!,
      ServerEvents.QuestionQueueUpdate
    );
    const stQueuePromise = waitFor<{ questions: QuestionEntryView[] }>(stSocket, ServerEvents.QuestionQueueUpdate);
    playerSockets[0]!.emit(ClientEvents.PlayerAskQuestion, { text: 'Private question from player 0' });

    const player0Queue = await player0QueuePromise;
    const stQueue = await stQueuePromise;

    // Player 0 sees only their own question.
    expect(player0Queue.questions).toHaveLength(1);
    expect(player0Queue.questions[0]!.playerId).toBe(playerIds[0]);

    // Storyteller sees it too (has to, in order to answer).
    expect(stQueue.questions.some((q) => q.playerId === playerIds[0])).toBe(true);

    // Storyteller answers it.
    const questionId = stQueue.questions.find((q) => q.playerId === playerIds[0])!.questionId;
    const player0AnswerPromise = waitFor<{ questions: QuestionEntryView[] }>(
      playerSockets[0]!,
      ServerEvents.QuestionQueueUpdate
    );
    stSocket.emit(ClientEvents.StorytellerAnswerQuestion, { questionId, answer: 'Private answer' });
    const player0AfterAnswer = await player0AnswerPromise;
    expect(player0AfterAnswer.questions[0]!.answer).toBe('Private answer');

    // Give any stray broadcast a moment to arrive, then assert player 1 never received it.
    await new Promise((r) => setTimeout(r, 150));
    for (const batch of player1Received) {
      expect(batch.some((q) => q.playerId === playerIds[0])).toBe(false);
    }

    stSocket.disconnect();
    for (const s of playerSockets) s.disconnect();
  }, 15000);
});
