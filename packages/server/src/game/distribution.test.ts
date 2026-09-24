import { describe, expect, it } from 'vitest';
import { MAX_PLAYERS, MIN_PLAYERS } from '@clocktower/shared';
import { SessionStore } from '../session/store.js';
import { buildPlayerDistributionPayload, distributeRoles } from './distribution.js';

function makeSessionWithPlayers(n: number) {
  const store = new SessionStore();
  const session = store.createSession('tok');
  for (let i = 0; i < n; i++) {
    store.addPlayer(session, `p${i}`, `Player${i}`);
  }
  return session;
}

describe('distributeRoles', () => {
  it('assigns exactly one character to every player for each supported player count', () => {
    for (let n = MIN_PLAYERS; n <= MAX_PLAYERS; n++) {
      const session = makeSessionWithPlayers(n);
      distributeRoles(session);
      const players = [...session.players.values()];
      expect(players).toHaveLength(n);
      for (const p of players) {
        expect(p.character).not.toBeNull();
        expect(p.characterType).not.toBeNull();
        expect(p.alignment).not.toBeNull();
      }
    }
  });

  it('never assigns the same character to two players (bijection)', () => {
    const session = makeSessionWithPlayers(15);
    distributeRoles(session);
    const characters = [...session.players.values()].map((p) => p.character);
    expect(new Set(characters).size).toBe(characters.length);
  });

  it('matches the exact type counts from the distribution table for N=10', () => {
    const session = makeSessionWithPlayers(10);
    distributeRoles(session);
    const counts = { townsfolk: 0, outsider: 0, minion: 0, demon: 0 };
    for (const p of session.players.values()) {
      if (p.characterType) counts[p.characterType] += 1;
    }
    expect(counts).toEqual({ townsfolk: 7, outsider: 0, minion: 2, demon: 1 });
  });

  it('throws for player counts outside the supported range', () => {
    const tooFew = makeSessionWithPlayers(4);
    expect(() => distributeRoles(tooFew)).toThrow();
    const tooMany = makeSessionWithPlayers(16);
    expect(() => distributeRoles(tooMany)).toThrow();
  });
});

describe('buildPlayerDistributionPayload (information hiding)', () => {
  it('never includes other players data for a Good-aligned player', () => {
    const session = makeSessionWithPlayers(10);
    distributeRoles(session);
    const goodPlayer = [...session.players.values()].find((p) => p.alignment === 'good');
    expect(goodPlayer).toBeDefined();
    const payload = buildPlayerDistributionPayload(session, goodPlayer!);
    expect(payload.role).toBe('player');
    expect('teammates' in payload).toBe(false);
    expect('bluffs' in payload).toBe(false);
  });

  it('includes teammates and bluffs only for an Evil-aligned player, and bluffs are Townsfolk not in play', () => {
    const session = makeSessionWithPlayers(10);
    distributeRoles(session);
    const evilPlayer = [...session.players.values()].find((p) => p.alignment === 'evil');
    expect(evilPlayer).toBeDefined();
    const payload = buildPlayerDistributionPayload(session, evilPlayer!);
    if (payload.role === 'player' && 'teammates' in payload) {
      const inPlayIds = new Set([...session.players.values()].map((p) => p.character));
      for (const bluff of payload.bluffs ?? []) {
        expect(inPlayIds.has(bluff.id)).toBe(false);
      }
      for (const teammate of payload.teammates ?? []) {
        expect(teammate.playerId).not.toBe(evilPlayer!.playerId);
      }
    } else {
      throw new Error('expected evil payload shape');
    }
  });
});
