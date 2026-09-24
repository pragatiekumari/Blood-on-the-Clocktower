export class ClocktowerError extends Error {
  readonly code: string;
  readonly httpStatus: number;

  constructor(code: string, message: string, httpStatus = 400) {
    super(message);
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

export const Errors = {
  invalidJoinCode: () =>
    new ClocktowerError('INVALID_JOIN_CODE', "That code doesn't match an active game. Double-check with your Storyteller.", 404),
  nameTaken: () =>
    new ClocktowerError('NAME_TAKEN', 'Someone in this game already has that name. Try another.', 409),
  sessionFull: () =>
    new ClocktowerError('SESSION_FULL', 'This game already has the maximum of 15 players.', 403),
  lobbyClosed: () =>
    new ClocktowerError('LOBBY_CLOSED', 'This game has already started and can no longer be joined.', 403),
  belowMinPlayers: (min: number) =>
    new ClocktowerError('BELOW_MIN_PLAYERS', `You need at least ${min} players before starting.`, 422),
  distributionRange: (min: number, max: number) =>
    new ClocktowerError('DISTRIBUTION_RANGE', `Blood on the Clocktower supports ${min}-${max} players.`, 422),
  notStoryteller: () =>
    new ClocktowerError('NOT_STORYTELLER', 'Only the Storyteller can do that.', 403),
  notAuthenticated: () =>
    new ClocktowerError('NOT_AUTHENTICATED', 'You need to rejoin the game.', 401),
  invalidToken: () =>
    new ClocktowerError('INVALID_TOKEN', 'Your session has expired. Please rejoin the game.', 401),
  playerNotFound: () =>
    new ClocktowerError('PLAYER_NOT_FOUND', "That player isn't in this game.", 404),
  alreadyNominatedToday: () =>
    new ClocktowerError('ALREADY_NOMINATED_TODAY', "You've already nominated someone today.", 403),
  nominatorDead: () =>
    new ClocktowerError('NOMINATOR_DEAD', 'Dead players cannot nominate.', 403),
  targetDead: () =>
    new ClocktowerError('TARGET_DEAD', 'You can only nominate a living player.', 403),
  nominationInProgress: () =>
    new ClocktowerError('NOMINATION_IN_PROGRESS', 'Only one nomination can be open at a time. Wait for it to close.', 403),
  noActiveNomination: () =>
    new ClocktowerError('NO_ACTIVE_NOMINATION', 'There is no open nomination to vote on.', 404),
  nominationClosed: () =>
    new ClocktowerError('NOMINATION_CLOSED', 'Voting has already closed on this nomination.', 403),
  noDeadVoteRemaining: () =>
    new ClocktowerError('NO_DEAD_VOTE_REMAINING', "You've already used your one vote as a ghost.", 403),
  notInEvilChat: () =>
    new ClocktowerError('NOT_IN_EVIL_CHAT', "You don't have access to this chat.", 403),
  invalidPhaseTransition: () =>
    new ClocktowerError('INVALID_PHASE_TRANSITION', 'That phase change is not allowed right now.', 400),
  distributionAlreadyDone: () =>
    new ClocktowerError('DISTRIBUTION_ALREADY_DONE', 'Roles have already been assigned for this game.', 403),
  validationFailed: (message: string) => new ClocktowerError('VALIDATION_FAILED', message, 422),
};
