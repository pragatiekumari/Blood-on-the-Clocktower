import { describe, expect, it } from 'vitest';
import { SessionStore, livingNeighborsOf } from './store.js';

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

describe('livingNeighborsOf', () => {
  it('returns the immediate seat neighbors when everyone is alive', () => {
    const { session, ids } = makeSessionWithPlayers(['Alice', 'Bob', 'Carol', 'Dan']);
    const [alice, bob, , dan] = ids;
    const { left, right } = livingNeighborsOf(session, bob!);
    expect(left?.playerId).toBe(alice);
    expect(right?.playerId).toBe(ids[2]);
    // Wraps around for the first/last seat.
    const aliceNeighbors = livingNeighborsOf(session, alice!);
    expect(aliceNeighbors.left?.playerId).toBe(dan);
  });

  it('skips dead players to find the nearest living neighbor in each direction', () => {
    const { session, ids } = makeSessionWithPlayers(['Alice', 'Bob', 'Carol', 'Dan', 'Eve']);
    const [alice, bob, carol, , eve] = ids;
    // Kill Bob and Carol (Alice's right-side neighbors).
    session.players.get(bob!)!.alive = false;
    session.players.get(carol!)!.alive = false;

    const { left, right } = livingNeighborsOf(session, alice!);
    expect(left?.playerId).toBe(eve);
    // Right neighbor should skip past dead Bob and Carol to reach Dan.
    expect(right?.playerId).toBe(ids[3]);
  });

  it('does not change neighbor computation based on join order, only fixed seatIndex', () => {
    const { session, ids } = makeSessionWithPlayers(['Alice', 'Bob', 'Carol']);
    const [alice, bob, carol] = ids;
    // Seat order stays fixed even though this reads join order by default; verify explicit seatIndex drives it.
    session.players.get(alice!)!.seatIndex = 2;
    session.players.get(bob!)!.seatIndex = 0;
    session.players.get(carol!)!.seatIndex = 1;

    const { left, right } = livingNeighborsOf(session, carol!);
    expect(left?.playerId).toBe(bob);
    expect(right?.playerId).toBe(alice);
  });

  it('returns null for both sides when there is only one player', () => {
    const { session, ids } = makeSessionWithPlayers(['Alice']);
    const { left, right } = livingNeighborsOf(session, ids[0]!);
    expect(left).toBeNull();
    expect(right).toBeNull();
  });
});
