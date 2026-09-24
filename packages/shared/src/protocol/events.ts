/** Client -> Server event names. */
export const ClientEvents = {
  Auth: 'auth',
  StorytellerStartDistribution: 'storyteller:startDistribution',
  StorytellerRedistribute: 'storyteller:redistribute',
  StorytellerSetPhase: 'storyteller:setPhase',
  StorytellerSetPlayerStatus: 'storyteller:setPlayerStatus',
  StorytellerMarkDead: 'storyteller:markDead',
  StorytellerShareAbilityResult: 'storyteller:shareAbilityResult',
  StorytellerSetPlayerAlignment: 'storyteller:setPlayerAlignment',
  StorytellerReorderSeats: 'storyteller:reorderSeats',
  StorytellerSetTimer: 'storyteller:setTimer',
  PlayerAskQuestion: 'player:askQuestion',
  StorytellerAnswerQuestion: 'storyteller:answerQuestion',
  PlayerNominate: 'player:nominate',
  PlayerVote: 'player:vote',
  StorytellerCloseVote: 'storyteller:closeVote',
  StorytellerConfirmExecution: 'storyteller:confirmExecution',
  ChatEvilSend: 'chat:evil:send',
} as const;

/** Server -> Client event names. */
export const ServerEvents = {
  AuthOk: 'auth:ok',
  LobbyUpdate: 'lobby:update',
  GameDistributed: 'game:distributed',
  GamePhaseChanged: 'game:phaseChanged',
  GrimoireUpdate: 'grimoire:update',
  PlayerSelfUpdate: 'player:selfUpdate',
  NominationOpened: 'nomination:opened',
  NominationVoteUpdate: 'nomination:voteUpdate',
  NominationClosed: 'nomination:closed',
  ExecutionConfirmed: 'execution:confirmed',
  ChatEvilMessage: 'chat:evil:message',
  ChatEvilHistory: 'chat:evil:history',
  QuestionQueueUpdate: 'question:queueUpdate',
  StorytellerConnectionStatus: 'storyteller:connectionStatus',
  Error: 'error',
} as const;

export interface ErrorPayload {
  code: string;
  message: string;
}
