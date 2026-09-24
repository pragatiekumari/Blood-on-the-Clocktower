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

describe('question queue gateway', () => {
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

  it('surfaces Evil questions ahead of Good ones and gates answering to the active question', async () => {
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

    const distributedPromise = waitFor<{ grimoire: { playerId: string; alignment: string }[] }>(
      stSocket,
      ServerEvents.GameDistributed
    );
    stSocket.emit(ClientEvents.StorytellerStartDistribution);
    const stPayload = await distributedPromise;

    const evilEntry = stPayload.grimoire.find((g) => g.alignment === 'evil')!;
    const goodEntry = stPayload.grimoire.find((g) => g.alignment === 'good')!;
    const evilIndex = playerIds.indexOf(evilEntry.playerId);
    const goodIndex = playerIds.indexOf(goodEntry.playerId);

    // Good player asks first, then Evil player asks — Evil should still end up first in the queue.
    const goodQueuePromise = waitFor<{ questions: QuestionEntryView[] }>(stSocket, ServerEvents.QuestionQueueUpdate);
    playerSockets[goodIndex]!.emit(ClientEvents.PlayerAskQuestion, { text: 'Good question' });
    await goodQueuePromise;

    const evilQueuePromise = waitFor<{ questions: QuestionEntryView[] }>(stSocket, ServerEvents.QuestionQueueUpdate);
    playerSockets[evilIndex]!.emit(ClientEvents.PlayerAskQuestion, { text: 'Evil question' });
    const evilQueue = await evilQueuePromise;

    expect(evilQueue.questions[0]!.playerId).toBe(evilEntry.playerId);
    expect(evilQueue.questions[1]!.playerId).toBe(goodEntry.playerId);

    // Answering the Good player's (non-active) question should fail.
    const goodQuestionId = evilQueue.questions[1]!.questionId;
    const errorPromise = waitFor<{ code: string }>(stSocket, ServerEvents.Error);
    stSocket.emit(ClientEvents.StorytellerAnswerQuestion, { questionId: goodQuestionId, answer: 'nope' });
    const error = await errorPromise;
    expect(error.code).toBe('QUESTION_NOT_ACTIVE');

    // Answering the active (Evil) question should succeed and reveal the next as active.
    const evilQuestionId = evilQueue.questions[0]!.questionId;
    const answeredPromise = waitFor<{ questions: QuestionEntryView[] }>(stSocket, ServerEvents.QuestionQueueUpdate);
    stSocket.emit(ClientEvents.StorytellerAnswerQuestion, { questionId: evilQuestionId, answer: 'Answer to evil' });
    const afterAnswer = await answeredPromise;

    const evilQ = afterAnswer.questions.find((q) => q.questionId === evilQuestionId)!;
    expect(evilQ.answered).toBe(true);
    expect(evilQ.answer).toBe('Answer to evil');

    stSocket.disconnect();
    for (const s of playerSockets) s.disconnect();
  }, 15000);
});
