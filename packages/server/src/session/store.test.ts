import { describe, expect, it } from 'vitest';
import { SessionStore, playersBySeat, reorderSeats } from './store.js';

function makeSessionWithPlayers(names: string[]) {
  const store = new SessionStore();
  const session = store.createSession('tok');
  const ids = names.map((name, i) => {
    const playerId = `p${i}`;
    store.addPlayer(session, playerId, name);
    return playerId;
  });
  return { session, ids };
}

describe('seat assignment', () => {
  it('assigns seatIndex in join order by default', () => {
    const { session, ids } = makeSessionWithPlayers(['Alice', 'Bob', 'Carol']);
    const seated = playersBySeat(session);
    expect(seated.map((p) => p.playerId)).toEqual(ids);
    expect(seated.map((p) => p.seatIndex)).toEqual([0, 1, 2]);
  });
});

describe('reorderSeats', () => {
  it('reassigns seatIndex to match the given order', () => {
    const { session, ids } = makeSessionWithPlayers(['Alice', 'Bob', 'Carol']);
    const [alice, bob, carol] = ids;
    reorderSeats(session, [carol!, alice!, bob!]);
    const seated = playersBySeat(session);
    expect(seated.map((p) => p.playerId)).toEqual([carol, alice, bob]);
    expect(seated.map((p) => p.seatIndex)).toEqual([0, 1, 2]);
  });

  it('appends players missing from the given order after the reordered ones, preserving their relative order', () => {
    const { session, ids } = makeSessionWithPlayers(['Alice', 'Bob', 'Carol', 'Dan']);
    const [alice, , carol] = ids;
    reorderSeats(session, [carol!, alice!]);
    const seated = playersBySeat(session);
    expect(seated.map((p) => p.playerId)).toEqual([carol, alice, 'p1', 'p3']);
  });

  it('ignores unknown player ids and duplicate ids in the given order', () => {
    const { session, ids } = makeSessionWithPlayers(['Alice', 'Bob']);
    const [alice, bob] = ids;
    reorderSeats(session, [bob!, 'unknown-id', bob!, alice!]);
    const seated = playersBySeat(session);
    expect(seated.map((p) => p.playerId)).toEqual([bob, alice]);
  });
});
