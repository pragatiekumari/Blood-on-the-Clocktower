import { describe, expect, it } from 'vitest';
import { SessionStore } from '../session/store.js';
import { castVote, closeVote, confirmExecution, executionThreshold, nominate, resetForNewDay } from './rules.js';

function makeSession(n: number) {
  const store = new SessionStore();
  const session = store.createSession('tok');
  for (let i = 0; i < n; i++) {
    store.addPlayer(session, `p${i}`, `Player${i}`);
  }
  return session;
}

describe('nominate', () => {
  it('opens a nomination for a living target by a living nominator', () => {
    const session = makeSession(5);
    const nomination = nominate(session, 'p0', 'p1');
    expect(nomination.nominatorId).toBe('p0');
    expect(nomination.targetId).toBe('p1');
    expect(session.players.get('p0')!.hasNominatedToday).toBe(true);
  });

  it('rejects a second nomination by the same player on the same day', () => {
    const session = makeSession(5);
    nominate(session, 'p0', 'p1');
    closeVote(session, session.nomination!.id);
    expect(() => nominate(session, 'p0', 'p2')).toThrow();
  });

  it('rejects nomination by a dead player', () => {
    const session = makeSession(5);
    session.players.get('p0')!.alive = false;
    expect(() => nominate(session, 'p0', 'p1')).toThrow();
  });

  it('rejects nomination of a dead target', () => {
    const session = makeSession(5);
    session.players.get('p1')!.alive = false;
    expect(() => nominate(session, 'p0', 'p1')).toThrow();
  });

  it('rejects a second concurrent open nomination', () => {
    const session = makeSession(5);
    nominate(session, 'p0', 'p1');
    expect(() => nominate(session, 'p2', 'p3')).toThrow();
  });
});

describe('castVote and dead-vote consumption', () => {
  it('allows a living player to vote freely', () => {
    const session = makeSession(5);
    const nomination = nominate(session, 'p0', 'p1');
    castVote(session, nomination.id, 'p2', true);
    expect(nomination.votes.get('p2')).toBe(true);
  });

  it('consumes a dead players single vote on first yes-vote and blocks a second use', () => {
    const session = makeSession(5);
    session.players.get('p2')!.alive = false;
    const nomination = nominate(session, 'p0', 'p1');
    castVote(session, nomination.id, 'p2', true);
    expect(session.players.get('p2')!.usedDeadVote).toBe(true);
    closeVote(session, nomination.id);
    resetForNewDay(session);
    const nomination2 = nominate(session, 'p3', 'p4');
    expect(() => castVote(session, nomination2.id, 'p2', true)).toThrow();
  });

  it('rejects voting on a closed nomination', () => {
    const session = makeSession(5);
    const nomination = nominate(session, 'p0', 'p1');
    closeVote(session, nomination.id);
    expect(() => castVote(session, nomination.id, 'p2', true)).toThrow();
  });
});

describe('executionThreshold and closeVote', () => {
  it('computes ceil(living/2) as the threshold', () => {
    const session = makeSession(5);
    expect(executionThreshold(session)).toBe(3);
    const session6 = makeSession(6);
    expect(executionThreshold(session6)).toBe(3);
    const session7 = makeSession(7);
    expect(executionThreshold(session7)).toBe(4);
  });

  it('flags pendingExecution when votes meet the threshold', () => {
    const session = makeSession(5);
    const nomination = nominate(session, 'p0', 'p1');
    castVote(session, nomination.id, 'p0', true);
    castVote(session, nomination.id, 'p2', true);
    castVote(session, nomination.id, 'p3', true);
    const closed = closeVote(session, nomination.id);
    expect(closed.pendingExecution).toBe(true);
  });

  it('does not flag pendingExecution when votes are below the threshold', () => {
    const session = makeSession(5);
    const nomination = nominate(session, 'p0', 'p1');
    castVote(session, nomination.id, 'p0', true);
    const closed = closeVote(session, nomination.id);
    expect(closed.pendingExecution).toBe(false);
  });

  it('invalidates both nominees on a tie between two qualifying nominations same day', () => {
    const session = makeSession(7); // threshold = 4
    const nom1 = nominate(session, 'p0', 'p1');
    castVote(session, nom1.id, 'p0', true);
    castVote(session, nom1.id, 'p2', true);
    castVote(session, nom1.id, 'p3', true);
    castVote(session, nom1.id, 'p4', true);
    const closed1 = closeVote(session, nom1.id);
    expect(closed1.pendingExecution).toBe(true);

    const nom2 = nominate(session, 'p5', 'p6');
    castVote(session, nom2.id, 'p0', true);
    castVote(session, nom2.id, 'p2', true);
    castVote(session, nom2.id, 'p3', true);
    castVote(session, nom2.id, 'p4', true);
    const closed2 = closeVote(session, nom2.id);

    expect(closed2.pendingExecution).toBe(false);
    expect(session.resolvedNominationsToday).toHaveLength(0);
  });
});

describe('confirmExecution', () => {
  it('marks the target dead when pendingExecution is true', () => {
    const session = makeSession(5);
    const nomination = nominate(session, 'p0', 'p1');
    castVote(session, nomination.id, 'p0', true);
    castVote(session, nomination.id, 'p2', true);
    castVote(session, nomination.id, 'p3', true);
    closeVote(session, nomination.id);
    confirmExecution(session, nomination.id);
    expect(session.players.get('p1')!.alive).toBe(false);
  });

  it('rejects execution when the nomination did not qualify', () => {
    const session = makeSession(5);
    const nomination = nominate(session, 'p0', 'p1');
    castVote(session, nomination.id, 'p0', true);
    closeVote(session, nomination.id);
    expect(() => confirmExecution(session, nomination.id)).toThrow();
  });
});

describe('resetForNewDay', () => {
  it('clears hasNominatedToday and the active nomination but preserves usedDeadVote', () => {
    const session = makeSession(5);
    session.players.get('p2')!.alive = false;
    const nomination = nominate(session, 'p0', 'p1');
    castVote(session, nomination.id, 'p2', true);
    closeVote(session, nomination.id);
    resetForNewDay(session);
    expect(session.players.get('p0')!.hasNominatedToday).toBe(false);
    expect(session.nomination).toBeNull();
    expect(session.players.get('p2')!.usedDeadVote).toBe(true);
  });
});
