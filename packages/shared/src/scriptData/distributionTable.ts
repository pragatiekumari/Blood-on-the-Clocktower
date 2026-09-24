import type { DistributionCounts } from './types.js';

/**
 * Official Trouble Brewing player-count distribution table.
 * Supported range: 5-15 players.
 */
export const DISTRIBUTION_TABLE: Record<number, DistributionCounts> = {
  5: { townsfolk: 3, outsider: 0, minion: 1, demon: 1 },
  6: { townsfolk: 3, outsider: 1, minion: 1, demon: 1 },
  7: { townsfolk: 5, outsider: 0, minion: 1, demon: 1 },
  8: { townsfolk: 5, outsider: 1, minion: 1, demon: 1 },
  9: { townsfolk: 5, outsider: 2, minion: 1, demon: 1 },
  10: { townsfolk: 7, outsider: 0, minion: 2, demon: 1 },
  11: { townsfolk: 7, outsider: 1, minion: 2, demon: 1 },
  12: { townsfolk: 7, outsider: 2, minion: 2, demon: 1 },
  13: { townsfolk: 9, outsider: 0, minion: 3, demon: 1 },
  14: { townsfolk: 9, outsider: 1, minion: 3, demon: 1 },
  15: { townsfolk: 9, outsider: 2, minion: 3, demon: 1 },
};

export const MIN_PLAYERS = 5;
export const MAX_PLAYERS = 15;

export function isValidPlayerCount(n: number): boolean {
  return Number.isInteger(n) && n >= MIN_PLAYERS && n <= MAX_PLAYERS;
}

export function getDistributionCounts(n: number): DistributionCounts {
  const counts = DISTRIBUTION_TABLE[n];
  if (!counts) {
    throw new RangeError(`No distribution defined for ${n} players (supported range ${MIN_PLAYERS}-${MAX_PLAYERS})`);
  }
  return counts;
}
