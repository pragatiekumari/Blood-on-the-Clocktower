import {
  TROUBLE_BREWING_CHARACTERS,
  charactersByType,
  getDistributionCounts,
  getCharacterById,
  isValidPlayerCount,
  MAX_PLAYERS,
  MIN_PLAYERS,
  type CharacterDefinition,
  type CharacterType,
  type DistributionPayload,
} from '@clocktower/shared';
import type { GameSession, PlayerRecord } from '../session/store.js';
import { Errors } from '../errors.js';

const BLUFF_COUNT = 3;

/** Fisher-Yates shuffle, returns a new array (does not mutate input). */
export function shuffle<T>(items: readonly T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j] as T, arr[i] as T];
  }
  return arr;
}

function sampleCharacters(type: CharacterType, count: number): CharacterDefinition[] {
  const pool = charactersByType(type);
  if (count > pool.length) {
    // Should never happen with the Trouble Brewing table + roster sizes, but guard anyway.
    throw new Error(`Not enough ${type} characters (${pool.length}) to select ${count}`);
  }
  return shuffle(pool).slice(0, count);
}

/**
 * Randomly assigns exactly one Trouble Brewing character to each joined player,
 * using the official player-count distribution table. Mutates the session's
 * PlayerRecords in place.
 */
export function distributeRoles(session: GameSession): void {
  const n = session.players.size;
  if (!isValidPlayerCount(n)) {
    throw Errors.distributionRange(MIN_PLAYERS, MAX_PLAYERS);
  }

  const counts = getDistributionCounts(n);
  const selected: CharacterDefinition[] = [
    ...sampleCharacters('townsfolk', counts.townsfolk),
    ...sampleCharacters('outsider', counts.outsider),
    ...sampleCharacters('minion', counts.minion),
    ...sampleCharacters('demon', counts.demon),
  ];

  const shuffledCharacters = shuffle(selected);
  const shuffledPlayers = shuffle([...session.players.values()]);

  shuffledPlayers.forEach((player, index) => {
    const character = shuffledCharacters[index];
    if (!character) {
      throw new Error('Distribution mismatch: fewer characters selected than players');
    }
    player.character = character.id;
    player.characterType = character.type;
    player.alignment = character.alignment;
  });
}

export function resetDistribution(session: GameSession): void {
  for (const player of session.players.values()) {
    player.character = null;
    player.characterType = null;
    player.alignment = null;
    player.alive = true;
    player.usedDeadVote = false;
    player.statusEffects = { poisoned: false, drunk: false, protected: false };
    player.hasNominatedToday = false;
  }
}

function computeBluffs(session: GameSession): { id: string; name: string }[] {
  const inPlayIds = new Set(
    [...session.players.values()].map((p) => p.character).filter((c): c is string => c !== null)
  );
  const unusedTownsfolk = TROUBLE_BREWING_CHARACTERS.filter(
    (c) => c.type === 'townsfolk' && !inPlayIds.has(c.id)
  );
  return shuffle(unusedTownsfolk)
    .slice(0, BLUFF_COUNT)
    .map((c) => ({ id: c.id, name: c.name }));
}

function evilTeammatesOf(session: GameSession, selfId: string) {
  return [...session.players.values()]
    .filter((p) => p.playerId !== selfId && p.alignment === 'evil')
    .map((p) => ({
      playerId: p.playerId,
      displayName: p.displayName,
      character: p.character ?? '',
      characterName: p.character ? getCharacterById(p.character)?.name ?? '' : '',
    }));
}

/** Builds the per-recipient distribution payload for a single player. Never includes other Good players' data. */
export function buildPlayerDistributionPayload(session: GameSession, player: PlayerRecord): DistributionPayload {
  const def = player.character ? getCharacterById(player.character) : undefined;
  if (!def || !player.characterType || !player.alignment) {
    throw new Error(`Player ${player.playerId} has no character assigned yet`);
  }
  const base = {
    role: 'player' as const,
    playerId: player.playerId,
    character: def.id,
    characterName: def.name,
    characterType: player.characterType,
    alignment: player.alignment,
    ability: def.ability,
  };
  if (player.alignment === 'evil') {
    return {
      ...base,
      teammates: evilTeammatesOf(session, player.playerId),
      bluffs: computeBluffs(session),
    };
  }
  return base;
}
