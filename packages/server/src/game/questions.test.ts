import { describe, expect, it } from 'vitest';
import { SessionStore } from '../session/store.js';
import { activeQuestion, answerQuestion, askQuestion, resetQuestionQueue } from './questions.js';

function makeSessionWithPlayers(players: { name: string; alignment: 'good' | 'evil' }[]) {
  const store = new SessionStore();
  const session = store.createSession('tok');
  const ids = players.map((p, i) => {
    const playerId = `p${i}`;
    const record = store.addPlayer(session, playerId, p.name);
    record.alignment = p.alignment;
    return playerId;
  });
  return { session, ids };
}

describe('askQuestion ordering', () => {
  it('keeps Good questions in submission order when no Evil questions are queued', () => {
    const { session, ids } = makeSessionWithPlayers([
      { name: 'Alice', alignment: 'good' },
      { name: 'Bob', alignment: 'good' },
    ]);
    askQuestion(session, ids[0]!, 'Alice question');
    askQuestion(session, ids[1]!, 'Bob question');
    expect(session.questionQueue.map((q) => q.playerId)).toEqual([ids[0], ids[1]]);
  });

  it('inserts an Evil question ahead of all pending Good questions', () => {
    const { session, ids } = makeSessionWithPlayers([
      { name: 'Alice', alignment: 'good' },
      { name: 'Bob', alignment: 'good' },
      { name: 'Carol', alignment: 'evil' },
    ]);
    askQuestion(session, ids[0]!, 'Alice question');
    askQuestion(session, ids[1]!, 'Bob question');
    askQuestion(session, ids[2]!, 'Carol question');
    // Carol (evil) jumps ahead of both pending Good questions.
    expect(session.questionQueue.map((q) => q.playerId)).toEqual([ids[2], ids[0], ids[1]]);
  });

  it('keeps multiple Evil questions in their own submission order, all ahead of Good ones', () => {
    const { session, ids } = makeSessionWithPlayers([
      { name: 'Alice', alignment: 'good' },
      { name: 'Carol', alignment: 'evil' },
      { name: 'Dan', alignment: 'evil' },
    ]);
    askQuestion(session, ids[0]!, 'Alice question');
    askQuestion(session, ids[1]!, 'Carol question');
    askQuestion(session, ids[2]!, 'Dan question');
    expect(session.questionQueue.map((q) => q.playerId)).toEqual([ids[1], ids[2], ids[0]]);
  });

  it('does not reorder already-answered questions when a new Evil question arrives', () => {
    const { session, ids } = makeSessionWithPlayers([
      { name: 'Alice', alignment: 'good' },
      { name: 'Bob', alignment: 'evil' },
    ]);
    const aliceQ = askQuestion(session, ids[0]!, 'Alice question');
    answerQuestion(session, aliceQ.id, 'Answered already');

    askQuestion(session, ids[1]!, 'Bob question');
    // Alice's answered question stays at the front of history; Bob's question is appended after it.
    expect(session.questionQueue.map((q) => q.playerId)).toEqual([ids[0], ids[1]]);
  });
});

describe('answerQuestion gating', () => {
  it('only allows answering the front-most unanswered question (active question)', () => {
    const { session, ids } = makeSessionWithPlayers([
      { name: 'Alice', alignment: 'good' },
      { name: 'Bob', alignment: 'evil' },
    ]);
    askQuestion(session, ids[0]!, 'Alice question');
    const bobQ = askQuestion(session, ids[1]!, 'Bob question');

    // Bob's (evil) question is active since it jumped the queue.
    expect(activeQuestion(session)?.id).toBe(bobQ.id);

    // Trying to answer Alice's question (not active) should throw.
    const aliceQ = session.questionQueue.find((q) => q.playerId === ids[0]);
    expect(() => answerQuestion(session, aliceQ!.id, 'nope')).toThrow();
  });

  it('activates the next question once the current one is answered', () => {
    const { session, ids } = makeSessionWithPlayers([
      { name: 'Alice', alignment: 'good' },
      { name: 'Bob', alignment: 'evil' },
    ]);
    askQuestion(session, ids[0]!, 'Alice question');
    const bobQ = askQuestion(session, ids[1]!, 'Bob question');

    answerQuestion(session, bobQ.id, 'Answer to Bob');
    const next = activeQuestion(session);
    expect(next?.playerId).toBe(ids[0]);
  });

  it('rejects answering an already-answered question', () => {
    const { session, ids } = makeSessionWithPlayers([{ name: 'Alice', alignment: 'good' }]);
    const q = askQuestion(session, ids[0]!, 'Alice question');
    answerQuestion(session, q.id, 'First answer');
    expect(() => answerQuestion(session, q.id, 'Second answer')).toThrow();
  });
});

describe('resetQuestionQueue', () => {
  it('clears all questions', () => {
    const { session, ids } = makeSessionWithPlayers([{ name: 'Alice', alignment: 'good' }]);
    askQuestion(session, ids[0]!, 'Alice question');
    resetQuestionQueue(session);
    expect(session.questionQueue).toHaveLength(0);
  });
});
