import { getCharacterById } from '@clocktower/shared';
import type { GameSession, PlayerRecord } from '../session/store.js';
import { Errors } from '../errors.js';

export interface DemonKillResult {
  targetPlayerId: string;
  /** Set only when the Demon killed itself and a Minion inherited the role. */
  inheritance: { previousDemonPlayerId: string; newDemonPlayerId: string; newDemonCharacterId: string } | null;
}

function shuffle<T>(items: readonly T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j] as T, arr[i] as T];
  }
  return arr;
}

function livingMinions(session: GameSession, excludingPlayerId: string): PlayerRecord[] {
  return [...session.players.values()].filter(
    (p) => p.alive && p.characterType === 'minion' && p.playerId !== excludingPlayerId
  );
}

/**
 * Resolves the Storyteller choosing a Demon-kill target at night. If the
 * killer targets themselves (the Imp's "kill yourself" option) and at
 * least one other Minion is alive, that Minion secretly becomes the new
 * Demon per the character's own rule ("If you kill yourself this way, a
 * Minion becomes the Imp"). The new Demon's PUBLIC identity does not
 * change: they keep playing as whichever character they were already
 * claiming (their real Minion character, or their bluff, from everyone
 * else's point of view) — only their true character/characterType flips
 * internally, and only their own client and the Storyteller ever learn
 * about the switch.
 */
export function resolveDemonKill(session: GameSession, killerId: string, targetPlayerId: string): DemonKillResult {
  const killer = session.players.get(killerId);
  const target = session.players.get(targetPlayerId);
  if (!killer || !target) throw Errors.playerNotFound();
  if (!killer.alive || killer.characterType !== 'demon') throw Errors.notTheDemon();
  if (!target.alive) throw Errors.targetDead();

  target.alive = false;

  if (targetPlayerId !== killerId) {
    return { targetPlayerId, inheritance: null };
  }

  // Self-kill: try to hand the Demon role to a random living Minion.
  const candidates = livingMinions(session, killerId);
  if (candidates.length === 0) {
    return { targetPlayerId, inheritance: null };
  }

  const [heir] = shuffle(candidates);
  const previousDemonCharacterId = killer.character;
  heir!.character = previousDemonCharacterId;
  heir!.characterType = 'demon';
  // Alignment is already 'evil' for any Minion, so it does not need to change.

  return {
    targetPlayerId,
    inheritance: {
      previousDemonPlayerId: killerId,
      newDemonPlayerId: heir!.playerId,
      newDemonCharacterId: previousDemonCharacterId ?? '',
    },
  };
}

export function characterName(id: string | null): string {
  if (!id) return 'Unknown';
  return getCharacterById(id)?.name ?? id;
}
