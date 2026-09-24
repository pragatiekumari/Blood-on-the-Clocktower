import { describe, expect, it } from 'vitest';
import { TROUBLE_BREWING_CHARACTERS } from './troubleBrewing.js';
import { DISTRIBUTION_TABLE, MAX_PLAYERS, MIN_PLAYERS, getDistributionCounts, isValidPlayerCount } from './distributionTable.js';

describe('Trouble Brewing character roster', () => {
  it('has 13 Townsfolk, 4 Outsiders, 4 Minions, and 1 Demon', () => {
    const counts = { townsfolk: 0, outsider: 0, minion: 0, demon: 0 };
    for (const c of TROUBLE_BREWING_CHARACTERS) {
      counts[c.type] += 1;
    }
    expect(counts.townsfolk).toBe(13);
    expect(counts.outsider).toBe(4);
    expect(counts.minion).toBe(4);
    expect(counts.demon).toBe(1);
  });

  it('has unique character ids', () => {
    const ids = TROUBLE_BREWING_CHARACTERS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('assigns good alignment to townsfolk/outsider and evil to minion/demon', () => {
    for (const c of TROUBLE_BREWING_CHARACTERS) {
      if (c.type === 'townsfolk' || c.type === 'outsider') {
        expect(c.alignment).toBe('good');
      } else {
        expect(c.alignment).toBe('evil');
      }
    }
  });
});

describe('Distribution table', () => {
  it('sums to N for every supported player count 5-15', () => {
    for (let n = MIN_PLAYERS; n <= MAX_PLAYERS; n++) {
      const counts = getDistributionCounts(n);
      const sum = counts.townsfolk + counts.outsider + counts.minion + counts.demon;
      expect(sum).toBe(n);
    }
  });

  it('has exactly 1 demon for every supported player count', () => {
    for (let n = MIN_PLAYERS; n <= MAX_PLAYERS; n++) {
      expect(getDistributionCounts(n).demon).toBe(1);
    }
  });

  it('rejects player counts outside the supported range', () => {
    expect(isValidPlayerCount(4)).toBe(false);
    expect(isValidPlayerCount(16)).toBe(false);
    expect(isValidPlayerCount(5)).toBe(true);
    expect(isValidPlayerCount(15)).toBe(true);
    expect(() => getDistributionCounts(4)).toThrow(RangeError);
    expect(() => getDistributionCounts(16)).toThrow(RangeError);
  });

  it('matches the exact published table values', () => {
    expect(DISTRIBUTION_TABLE[5]).toEqual({ townsfolk: 3, outsider: 0, minion: 1, demon: 1 });
    expect(DISTRIBUTION_TABLE[10]).toEqual({ townsfolk: 7, outsider: 0, minion: 2, demon: 1 });
    expect(DISTRIBUTION_TABLE[15]).toEqual({ townsfolk: 9, outsider: 2, minion: 3, demon: 1 });
  });
});
