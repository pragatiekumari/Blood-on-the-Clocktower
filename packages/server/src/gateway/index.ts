import type { Server as SocketIOServer, Socket } from 'socket.io';
import { ZodError } from 'zod';
import {
  AnswerQuestionSchema,
  AskQuestionSchema,
  AuthPayloadSchema,
  ChatSendSchema,
  CloseVoteSchema,
  ConfirmExecutionSchema,
  MarkDeadSchema,
  NominateSchema,
  ServerEvents,
  ClientEvents,
  ReorderSeatsSchema,
  SetPhaseSchema,
  SetPlayerAlignmentSchema,
  SetPlayerStatusSchema,
  SetTimerSchema,
  ShareAbilityResultSchema,
  VoteSchema,
  MIN_PLAYERS,
  type QuestionEntryView,
} from '@clocktower/shared';
import type { SessionStore, GameSession, PlayerRecord, QuestionEntry } from '../session/store.js';
import { reorderSeats } from '../session/store.js';
import { syncEvilRoomMembership, sendEvilHistoryTo, sendEvilMessage } from '../game/chat.js';
import { distributeRoles, resetDistribution, buildPlayerDistributionPayload } from '../game/distribution.js';
import { askQuestion, answerQuestion, resetQuestionQueue } from '../game/questions.js';
import {
  broadcastGrimoire,
  broadcastLobby,
  buildGrimoire,
  sendError,
  sendToPlayer,
  sendToStoryteller,
  sessionRoom,
} from '../game/broadcast.js';
import { castVote, closeVote, confirmExecution, nominate, resetForNewDay, toNominationView } from '../game/rules.js';
import { ClocktowerError, Errors } from '../errors.js';
import { resolveAndBind, type AuthenticatedIdentity } from './socketAuth.js';

interface SocketState {
  identity: AuthenticatedIdentity | null;
}

const socketStates = new WeakMap<Socket, SocketState>();

function getState(socket: Socket): SocketState {
  let state = socketStates.get(socket);
  if (!state) {
    state = { identity: null };
    socketStates.set(socket, state);
  }
  return state;
}

function requireAuth(socket: Socket): AuthenticatedIdentity {
  const state = getState(socket);
  if (!state.identity) throw Errors.notAuthenticated();
  return state.identity;
}

function requireStoryteller(socket: Socket): GameSession {
  const identity = requireAuth(socket);
  if (!identity.isStoryteller) throw Errors.notStoryteller();
  return identity.session;
}

function requirePlayer(socket: Socket): { session: GameSession; player: PlayerRecord } {
  const identity = requireAuth(socket);
  if (identity.isStoryteller || !identity.player) throw Errors.notAuthenticated();
  return { session: identity.session, player: identity.player };
}

/** Wraps a handler so any thrown ClocktowerError becomes a scoped `error` event instead of crashing the process. */
function guarded(io: SocketIOServer, socket: Socket, fn: () => void): void {
  try {
    fn();
  } catch (err) {
    if (err instanceof ClocktowerError) {
      sendError(io, socket.id, err.code, err.message);
    } else if (err instanceof ZodError) {
      sendError(io, socket.id, 'VALIDATION_FAILED', "That action wasn't formatted correctly. Please try again.");
    } else {
      console.error('Unexpected gateway error:', err);
      sendError(io, socket.id, 'INTERNAL_ERROR', 'Something went wrong. Please try again.');
    }
  }
}

function broadcastPhaseChanged(io: SocketIOServer, session: GameSession): void {
  io.to(sessionRoom(session.code)).emit(ServerEvents.GamePhaseChanged, {
    phase: session.phase,
    dayNumber: session.dayNumber,
    phaseEndsAt: session.phaseEndsAt,
  });
}

function toQuestionView(q: QuestionEntry): QuestionEntryView {
  return {
    questionId: q.id,
    playerId: q.playerId,
    playerName: q.playerName,
    text: q.text,
    answer: q.answer,
    answered: q.answered,
    askedAt: q.askedAt,
  };
}

/**
 * Questions are private: only the Storyteller (full queue, so they can
 * answer in the correct Evil-first order) and the asking player themselves
 * (their own questions only) see them. Other players never see anyone
 * else's question or answer unless that player chooses to repeat it aloud
 * during discussion — that's a conversation the app doesn't need to
 * mediate, so nothing is broadcast to the room.
 */
function sendQuestionQueueUpdates(io: SocketIOServer, session: GameSession): void {
  sendToStoryteller(io, session, ServerEvents.QuestionQueueUpdate, {
    questions: session.questionQueue.map(toQuestionView),
  });
  for (const player of session.players.values()) {
    const own = session.questionQueue.filter((q) => q.playerId === player.playerId).map(toQuestionView);
    sendToPlayer(io, player, ServerEvents.QuestionQueueUpdate, { questions: own });
  }
}

function broadcastDistribution(io: SocketIOServer, session: GameSession): void {
  for (const player of session.players.values()) {
    const payload = buildPlayerDistributionPayload(session, player);
    sendToPlayer(io, player, ServerEvents.GameDistributed, payload);
  }
  sendToStoryteller(io, session, ServerEvents.GameDistributed, {
    role: 'storyteller',
    grimoire: buildGrimoire(session),
  });
  syncEvilRoomMembership(io, session);
}

export function registerGatewayHandlers(io: SocketIOServer, store: SessionStore): void {
  io.on('connection', (socket) => {
    // Lightweight keep-alive: no auth required, just touches the session
    // (if this socket is already authenticated) so idle-but-open connections
    // don't get recycled by hosting-platform idle timeouts.
    socket.on('ping', () => {
      const identity = getState(socket).identity;
      if (identity) store.touch(identity.session);
    });

    socket.on(ClientEvents.Auth, (raw: unknown) =>
      guarded(io, socket, () => {
        const parsed = AuthPayloadSchema.parse(raw);
        const identity = resolveAndBind(store, socket, parsed.token);
        getState(socket).identity = identity;
        socket.join(sessionRoom(identity.session.code));
        if (identity.isStoryteller) {
          io.to(identity.session.code).emit(ServerEvents.StorytellerConnectionStatus, { connected: true });
          broadcastGrimoire(io, identity.session);
        } else if (identity.player) {
          if (identity.player.alignment === 'evil') {
            syncEvilRoomMembership(io, identity.session);
            sendEvilHistoryTo(io, socket.id, identity.session);
          }
          if (identity.player.character) {
            const payload = buildPlayerDistributionPayload(identity.session, identity.player);
            sendToPlayer(io, identity.player, ServerEvents.GameDistributed, payload);
          }
        }
        socket.emit(ServerEvents.AuthOk, {
          role: identity.isStoryteller ? 'storyteller' : 'player',
          phase: identity.session.phase,
          dayNumber: identity.session.dayNumber,
          phaseEndsAt: identity.session.phaseEndsAt,
        });
        if (identity.isStoryteller) {
          socket.emit(ServerEvents.QuestionQueueUpdate, {
            questions: identity.session.questionQueue.map(toQuestionView),
          });
        } else if (identity.player) {
          const own = identity.session.questionQueue
            .filter((q) => q.playerId === identity.player!.playerId)
            .map(toQuestionView);
          socket.emit(ServerEvents.QuestionQueueUpdate, { questions: own });
        }
        broadcastLobby(io, identity.session);
        store.touch(identity.session);
      })
    );

    socket.on(ClientEvents.StorytellerStartDistribution, () =>
      guarded(io, socket, () => {
        const session = requireStoryteller(socket);
        if (session.phase !== 'lobby') throw Errors.distributionAlreadyDone();
        if (session.players.size < MIN_PLAYERS) throw Errors.belowMinPlayers(MIN_PLAYERS);
        distributeRoles(session);
        session.phase = 'day';
        session.dayNumber = 1;
        session.phaseEndsAt = null;
        broadcastDistribution(io, session);
        broadcastPhaseChanged(io, session);
        store.touch(session);
      })
    );

    socket.on(ClientEvents.StorytellerRedistribute, () =>
      guarded(io, socket, () => {
        const session = requireStoryteller(socket);
        if (session.phase !== 'lobby') throw Errors.distributionAlreadyDone();
        resetDistribution(session);
        distributeRoles(session);
        broadcastDistribution(io, session);
        store.touch(session);
      })
    );

    socket.on(ClientEvents.StorytellerSetPhase, (raw: unknown) =>
      guarded(io, socket, () => {
        const session = requireStoryteller(socket);
        const { phase, timerSeconds } = SetPhaseSchema.parse(raw);
        if (session.phase !== 'day' && session.phase !== 'night') throw Errors.invalidPhaseTransition();
        if (phase === 'day') {
          resetForNewDay(session);
          resetQuestionQueue(session);
          session.dayNumber += 1;
        }
        session.phase = phase;
        session.phaseEndsAt = timerSeconds ? Date.now() + timerSeconds * 1000 : null;
        broadcastPhaseChanged(io, session);
        broadcastGrimoire(io, session);
        sendQuestionQueueUpdates(io, session);
        store.touch(session);
      })
    );

    socket.on(ClientEvents.StorytellerSetTimer, (raw: unknown) =>
      guarded(io, socket, () => {
        const session = requireStoryteller(socket);
        const { timerSeconds } = SetTimerSchema.parse(raw);
        session.phaseEndsAt = timerSeconds ? Date.now() + timerSeconds * 1000 : null;
        broadcastPhaseChanged(io, session);
        store.touch(session);
      })
    );

    socket.on(ClientEvents.StorytellerSetPlayerStatus, (raw: unknown) =>
      guarded(io, socket, () => {
        const session = requireStoryteller(socket);
        const { playerId, statusEffects } = SetPlayerStatusSchema.parse(raw);
        const player = session.players.get(playerId);
        if (!player) throw Errors.playerNotFound();
        player.statusEffects = { ...player.statusEffects, ...statusEffects };
        broadcastGrimoire(io, session);
        store.touch(session);
      })
    );

    socket.on(ClientEvents.StorytellerMarkDead, (raw: unknown) =>
      guarded(io, socket, () => {
        const session = requireStoryteller(socket);
        const { playerId } = MarkDeadSchema.parse(raw);
        const player = session.players.get(playerId);
        if (!player) throw Errors.playerNotFound();
        player.alive = false;
        broadcastGrimoire(io, session);
        broadcastLobby(io, session);
        sendToPlayer(io, player, ServerEvents.PlayerSelfUpdate, { alive: false });
        store.touch(session);
      })
    );

    socket.on(ClientEvents.StorytellerShareAbilityResult, (raw: unknown) =>
      guarded(io, socket, () => {
        const session = requireStoryteller(socket);
        const { playerId, text } = ShareAbilityResultSchema.parse(raw);
        const player = session.players.get(playerId);
        if (!player) throw Errors.playerNotFound();
        sendToPlayer(io, player, ServerEvents.PlayerSelfUpdate, { abilityResult: text });
        store.touch(session);
      })
    );

    socket.on(ClientEvents.StorytellerSetPlayerAlignment, (raw: unknown) =>
      guarded(io, socket, () => {
        const session = requireStoryteller(socket);
        const { playerId, alignment } = SetPlayerAlignmentSchema.parse(raw);
        const player = session.players.get(playerId);
        if (!player) throw Errors.playerNotFound();
        player.alignment = alignment;
        syncEvilRoomMembership(io, session);
        broadcastGrimoire(io, session);
        const payload = player.character ? buildPlayerDistributionPayload(session, player) : null;
        if (payload) sendToPlayer(io, player, ServerEvents.GameDistributed, payload);
        store.touch(session);
      })
    );

    socket.on(ClientEvents.StorytellerReorderSeats, (raw: unknown) =>
      guarded(io, socket, () => {
        const session = requireStoryteller(socket);
        const { orderedPlayerIds } = ReorderSeatsSchema.parse(raw);
        reorderSeats(session, orderedPlayerIds);
        broadcastGrimoire(io, session);
        broadcastLobby(io, session);
        store.touch(session);
      })
    );

    socket.on(ClientEvents.PlayerNominate, (raw: unknown) =>
      guarded(io, socket, () => {
        const { session, player } = requirePlayer(socket);
        const { targetPlayerId } = NominateSchema.parse(raw);
        const nomination = nominate(session, player.playerId, targetPlayerId);
        io.to(sessionRoom(session.code)).emit(ServerEvents.NominationOpened, toNominationView(nomination));
        store.touch(session);
      })
    );

    socket.on(ClientEvents.PlayerVote, (raw: unknown) =>
      guarded(io, socket, () => {
        const { session, player } = requirePlayer(socket);
        const { nominationId, voting } = VoteSchema.parse(raw);
        const nomination = castVote(session, nominationId, player.playerId, voting);
        io.to(sessionRoom(session.code)).emit(ServerEvents.NominationVoteUpdate, toNominationView(nomination));
        store.touch(session);
      })
    );

    socket.on(ClientEvents.StorytellerCloseVote, (raw: unknown) =>
      guarded(io, socket, () => {
        const session = requireStoryteller(socket);
        const { nominationId } = CloseVoteSchema.parse(raw);
        const nomination = closeVote(session, nominationId);
        io.to(sessionRoom(session.code)).emit(ServerEvents.NominationClosed, toNominationView(nomination));
        store.touch(session);
      })
    );

    socket.on(ClientEvents.StorytellerConfirmExecution, (raw: unknown) =>
      guarded(io, socket, () => {
        const session = requireStoryteller(socket);
        const { nominationId } = ConfirmExecutionSchema.parse(raw);
        const targetId = session.nomination?.targetId;
        confirmExecution(session, nominationId);
        if (targetId) {
          io.to(sessionRoom(session.code)).emit(ServerEvents.ExecutionConfirmed, { playerId: targetId });
        }
        broadcastGrimoire(io, session);
        broadcastLobby(io, session);
        store.touch(session);
      })
    );

    socket.on(ClientEvents.ChatEvilSend, (raw: unknown) =>
      guarded(io, socket, () => {
        const { session, player } = requirePlayer(socket);
        const { text } = ChatSendSchema.parse(raw);
        sendEvilMessage(io, session, player.playerId, player.displayName, text);
        store.touch(session);
      })
    );

    socket.on(ClientEvents.PlayerAskQuestion, (raw: unknown) =>
      guarded(io, socket, () => {
        const { session, player } = requirePlayer(socket);
        const { text } = AskQuestionSchema.parse(raw);
        askQuestion(session, player.playerId, text);
        sendQuestionQueueUpdates(io, session);
        store.touch(session);
      })
    );

    socket.on(ClientEvents.StorytellerAnswerQuestion, (raw: unknown) =>
      guarded(io, socket, () => {
        const session = requireStoryteller(socket);
        const { questionId, answer } = AnswerQuestionSchema.parse(raw);
        answerQuestion(session, questionId, answer);
        sendQuestionQueueUpdates(io, session);
        store.touch(session);
      })
    );

    socket.on('disconnect', () => {
      const state = getState(socket);
      const identity = state.identity;
      if (!identity) return;
      // Only clear the connection if THIS socket is still the current one for
      // that identity. A page refresh authenticates a new socket before the
      // old socket's disconnect event fires; without this check, the stale
      // disconnect would wipe out the new (already-reconnected) connection
      // id and everyone would see the player as disconnected even though
      // they're actually online.
      if (identity.isStoryteller) {
        if (identity.session.storytellerConnectionId === socket.id) {
          identity.session.storytellerConnectionId = null;
          io.to(sessionRoom(identity.session.code)).emit(ServerEvents.StorytellerConnectionStatus, { connected: false });
        }
      } else if (identity.player) {
        if (identity.player.connectionId === socket.id) {
          identity.player.connectionId = null;
          broadcastLobby(io, identity.session);
        }
      }
    });
  });
}
