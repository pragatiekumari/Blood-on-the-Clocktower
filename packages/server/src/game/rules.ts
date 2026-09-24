import { nanoid } from 'nanoid';
import type { ActiveNominationView } from '@clocktower/shared';
import type { ActiveNomination, GameSession } from '../session/store.js';
import { livingPlayerCount } from '../session/store.js';
import { Errors } from '../errors.js';

export function nominate(session: GameSession, nominatorId: string, targetId: string): ActiveNomination {
  const nominator = session.players.get(nominatorId);
  const target = session.players.get(targetId);
  if (!nominator || !target) throw Errors.playerNotFound();
  if (!nominator.alive) throw Errors.nominatorDead();
  if (!target.alive) throw Errors.targetDead();
  if (nominator.hasNominatedToday) throw Errors.alreadyNominatedToday();
  if (session.nomination && !session.nomination.closed) throw Errors.nominationInProgress();

  const nomination: ActiveNomination = {
    id: nanoid(10),
    nominatorId,
    targetId,
    votes: new Map(),
    openedAt: Date.now(),
    closed: false,
    pendingExecution: false,
    resolvedTally: null,
  };
  nominator.hasNominatedToday = true;
  session.nomination = nomination;
  return nomination;
}

export function castVote(session: GameSession, nominationId: string, playerId: string, voting: boolean): ActiveNomination {
  const nomination = session.nomination;
  if (!nomination || nomination.id !== nominationId) throw Errors.noActiveNomination();
  if (nomination.closed) throw Errors.nominationClosed();

  const voter = session.players.get(playerId);
  if (!voter) throw Errors.playerNotFound();

  if (!voter.alive) {
    if (voter.usedDeadVote && voting) {
      throw Errors.noDeadVoteRemaining();
    }
    if (voting) {
      // Using the ghost vote is consumed the moment it's cast, regardless of later retraction.
      voter.usedDeadVote = true;
    }
  }

  nomination.votes.set(playerId, voting);
  return nomination;
}

/** ceil(livingPlayers / 2), the standard 50%-or-more execution threshold. */
export function executionThreshold(session: GameSession): number {
  return Math.ceil(livingPlayerCount(session) / 2);
}

export function tally(nomination: ActiveNomination): number {
  let count = 0;
  for (const voting of nomination.votes.values()) {
    if (voting) count++;
  }
  return count;
}

export function closeVote(session: GameSession, nominationId: string): ActiveNomination {
  const nomination = session.nomination;
  if (!nomination || nomination.id !== nominationId) throw Errors.noActiveNomination();
  if (nomination.closed) throw Errors.nominationClosed();

  const votesFor = tally(nomination);
  const threshold = executionThreshold(session);
  const qualifies = votesFor >= threshold && votesFor > 0;

  nomination.closed = true;
  nomination.resolvedTally = votesFor;

  if (qualifies) {
    // Check for a tie against any other nomination that qualified earlier today.
    const tiedWithEarlier = session.resolvedNominationsToday.some((r) => r.tally === votesFor);
    if (tiedWithEarlier) {
      nomination.pendingExecution = false;
      // The earlier qualifying nomination is also invalidated by the tie.
      session.resolvedNominationsToday = session.resolvedNominationsToday.filter((r) => r.tally !== votesFor);
    } else {
      nomination.pendingExecution = true;
      session.resolvedNominationsToday.push({ targetId: nomination.targetId, tally: votesFor });
    }
  } else {
    nomination.pendingExecution = false;
  }

  return nomination;
}

export function confirmExecution(session: GameSession, nominationId: string): void {
  const nomination = session.nomination;
  if (!nomination || nomination.id !== nominationId) throw Errors.noActiveNomination();
  if (!nomination.closed || !nomination.pendingExecution) {
    throw Errors.invalidPhaseTransition();
  }
  const target = session.players.get(nomination.targetId);
  if (!target) throw Errors.playerNotFound();
  target.alive = false;
  // Remove from the qualifying list so a later tie in the same day can't reference a resolved execution twice.
  session.resolvedNominationsToday = session.resolvedNominationsToday.filter((r) => r.targetId !== nomination.targetId);
}

/** Called when transitioning into the day phase: resets per-day nomination usage, preserves lifetime dead-vote usage. */
export function resetForNewDay(session: GameSession): void {
  for (const player of session.players.values()) {
    player.hasNominatedToday = false;
  }
  session.nomination = null;
  session.resolvedNominationsToday = [];
}

export function toNominationView(nomination: ActiveNomination): ActiveNominationView {
  return {
    nominationId: nomination.id,
    nominatorId: nomination.nominatorId,
    targetId: nomination.targetId,
    votes: [...nomination.votes.entries()].map(([playerId, voting]) => ({ playerId, voting })),
    closed: nomination.closed,
    pendingExecution: nomination.pendingExecution,
  };
}
