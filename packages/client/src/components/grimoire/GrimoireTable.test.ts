import { describe, expect, it } from 'vitest';
import type { GrimoirePlayerEntry } from '@clocktower/shared';
import { sortGrimoire } from './GrimoireTable.js';

function makeEntry(overrides: Partial<GrimoirePlayerEntry>): GrimoirePlayerEntry {
  return {
    playerId: overrides.playerId ?? 'p',
    displayName: overrides.displayName ?? 'Player',
    character: overrides.character ?? null,
    characterType: overrides.characterType ?? null,
    alignment: overrides.alignment ?? null,
    alive: overrides.alive ?? true,
    statusEffects: overrides.statusEffects ?? { poisoned: false, drunk: false, protected: false },
    usedDeadVote: overrides.usedDeadVote ?? false,
    connected: overrides.connected ?? true,
    seatIndex: overrides.seatIndex ?? 0,
  };
}

describe('sortGrimoire', () => {
  it('orders Demon and Minion before Townsfolk and Outsider', () => {
    const entries = [
      makeEntry({ playerId: '1', displayName: 'Alice', characterType: 'townsfolk' }),
      makeEntry({ playerId: '2', displayName: 'Bob', characterType: 'demon' }),
      makeEntry({ playerId: '3', displayName: 'Carol', characterType: 'outsider' }),
      makeEntry({ playerId: '4', displayName: 'Dan', characterType: 'minion' }),
    ];
    const sorted = sortGrimoire(entries);
    expect(sorted.map((e) => e.playerId)).toEqual(['2', '4', '1', '3']);
  });

  it('sorts alive players before dead players within the same alignment group', () => {
    const entries = [
      makeEntry({ playerId: '1', displayName: 'Alice', characterType: 'townsfolk', alive: false }),
      makeEntry({ playerId: '2', displayName: 'Bob', characterType: 'townsfolk', alive: true }),
    ];
    const sorted = sortGrimoire(entries);
    expect(sorted.map((e) => e.playerId)).toEqual(['2', '1']);
  });

  it('sorts unassigned characters (pre-distribution) last', () => {
    const entries = [
      makeEntry({ playerId: '1', displayName: 'Alice', characterType: null }),
      makeEntry({ playerId: '2', displayName: 'Bob', characterType: 'demon' }),
    ];
    const sorted = sortGrimoire(entries);
    expect(sorted.map((e) => e.playerId)).toEqual(['2', '1']);
  });

  it('does not mutate the input array', () => {
    const entries = [
      makeEntry({ playerId: '1', characterType: 'townsfolk' }),
      makeEntry({ playerId: '2', characterType: 'demon' }),
    ];
    const original = [...entries];
    sortGrimoire(entries);
    expect(entries).toEqual(original);
  });
});
