import type { WinningTeam, GameEndReason } from '@clocktower/shared';
import type { GameSession, PlayerRecord } from '../session/store.js';
import { livingPlayerCount } from '../session/store.js';

export interface WinCheckResult {
  winner: WinningTeam;
  reason: GameEndReason;
}

export interface ScarletWomanTakeoverResult {
  previousDemonPlayerId: string;
  newDemonPlayerId: string;
  newDemonCharacterId: string;
}

function livingDemon(session: GameSession): PlayerRecord | null {
  for (const p of session.players.values()) {
    if (p.alive && p.characterType === 'demon') return p;
  }
  return null;
}

/**
 * Scarlet Woman: "If there are 5 or more players alive & the Demon dies,
 * you become the Demon." This must be checked (and resolved) BEFORE
 * checkWinCondition() whenever the Demon is executed, so a legitimate
 * hand-off doesn't get mistaken for "no Demon left -> Good wins." Does
 * nothing (returns null) if no living Scarlet Woman exists, or the living
 * player count (AFTER this death) is below 5.
 */
export function tryScarletWomanTakeover(session: GameSession, deadDemonId: string): ScarletWomanTakeoverResult | null {
  if (livingPlayerCount(session) < 5) return null;

  const scarletWoman = [...session.players.values()].find(
    (p) => p.alive && p.character === 'scarlet-woman' && p.playerId !== deadDemonId
  );
  if (!scarletWoman) return null;

  const deadDemon = session.players.get(deadDemonId);
  const inheritedCharacterId = deadDemon?.character ?? null;

  scarletWoman.character = inheritedCharacterId;
  scarletWoman.characterType = 'demon';

  return {
    previousDemonPlayerId: deadDemonId,
    newDemonPlayerId: scarletWoman.playerId,
    newDemonCharacterId: inheritedCharacterId ?? '',
  };
}

/**
 * Checks whether the game has just ended, per the standard Trouble Brewing
 * win conditions:
 *   - Good wins the instant there is no living Demon (it died and nobody
 *     inherited the role — see demonKill.ts for Imp self-kill / Scarlet
 *     Woman inheritance, which must run BEFORE this check so a legitimate
 *     hand-off doesn't falsely end the game).
 *   - Evil wins the instant only 2 players remain alive.
 * Returns null if the game should continue. Callers are expected to run
 * this after any death (execution or night kill) and after any
 * demon-inheritance logic has already resolved.
 */
export function checkWinCondition(session: GameSession, deathReason: 'executed' | 'self-killed'): WinCheckResult | null {
  const living = livingPlayerCount(session);

  if (living <= 2) {
    return { winner: 'evil', reason: 'two-players-left' };
  }

  if (!livingDemon(session)) {
    return {
      winner: 'good',
      reason: deathReason === 'executed' ? 'demon-executed' : 'demon-self-killed',
    };
  }

  return null;
}

export function endGame(session: GameSession, winner: WinningTeam, reason: GameEndReason): void {
  session.phase = 'ended';
  session.gameResult = { winner, reason };
}
