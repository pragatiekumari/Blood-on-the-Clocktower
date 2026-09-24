import { useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';
import {
  ServerEvents,
  type ActiveNominationView,
  type DistributionPayload,
  type ErrorPayload,
  type GamePhase,
  type GrimoirePlayerEntry,
} from '@clocktower/shared';

export interface LobbyPlayer {
  playerId: string;
  displayName: string;
  connected: boolean;
  alive: boolean;
  seatIndex: number;
}

export interface ChatMessageView {
  senderId: string;
  senderName: string;
  text: string;
  ts: number;
}

export interface SessionState {
  role: 'storyteller' | 'player' | null;
  phase: GamePhase;
  dayNumber: number;
  lobbyPlayers: LobbyPlayer[];
  distribution: DistributionPayload | null;
  grimoire: GrimoirePlayerEntry[] | null;
  nomination: ActiveNominationView | null;
  lastExecutedPlayerId: string | null;
  executionEventId: number;
  chatMessages: ChatMessageView[];
  storytellerConnected: boolean;
  abilityResult: string | null;
  alive: boolean;
  lastError: ErrorPayload | null;
}

const initialState: SessionState = {
  role: null,
  phase: 'lobby',
  dayNumber: 0,
  lobbyPlayers: [],
  distribution: null,
  grimoire: null,
  nomination: null,
  lastExecutedPlayerId: null,
  executionEventId: 0,
  chatMessages: [],
  storytellerConnected: true,
  abilityResult: null,
  alive: true,
  lastError: null,
};

export function useSession(socket: Socket | null): SessionState {
  const [state, setState] = useState<SessionState>(initialState);

  useEffect(() => {
    if (!socket) return undefined;

    const onAuthOk = (payload: { role: 'storyteller' | 'player'; phase: GamePhase; dayNumber: number }) => {
      setState((s) => ({ ...s, role: payload.role, phase: payload.phase, dayNumber: payload.dayNumber }));
    };
    const onLobbyUpdate = (payload: { players: LobbyPlayer[] }) => {
      setState((s) => ({ ...s, lobbyPlayers: payload.players }));
    };
    const onDistributed = (payload: DistributionPayload) => {
      setState((s) => ({
        ...s,
        distribution: payload,
        grimoire: payload.role === 'storyteller' ? payload.grimoire : s.grimoire,
      }));
    };
    const onPhaseChanged = (payload: { phase: GamePhase; dayNumber: number }) => {
      setState((s) => ({ ...s, phase: payload.phase, dayNumber: payload.dayNumber, nomination: null }));
    };
    const onGrimoireUpdate = (payload: { grimoire: GrimoirePlayerEntry[] }) => {
      setState((s) => ({ ...s, grimoire: payload.grimoire }));
    };
    const onSelfUpdate = (payload: { alive?: boolean; abilityResult?: string }) => {
      setState((s) => ({
        ...s,
        alive: payload.alive ?? s.alive,
        abilityResult: payload.abilityResult ?? s.abilityResult,
      }));
    };
    const onNominationOpened = (payload: ActiveNominationView) => {
      setState((s) => ({ ...s, nomination: payload }));
    };
    const onNominationVoteUpdate = (payload: ActiveNominationView) => {
      setState((s) => ({ ...s, nomination: payload }));
    };
    const onNominationClosed = (payload: ActiveNominationView) => {
      setState((s) => ({ ...s, nomination: payload }));
    };
    const onExecutionConfirmed = (payload: { playerId: string }) => {
      setState((s) => ({ ...s, lastExecutedPlayerId: payload.playerId, executionEventId: s.executionEventId + 1 }));
    };
    const onChatMessage = (payload: ChatMessageView) => {
      setState((s) => ({ ...s, chatMessages: [...s.chatMessages, payload] }));
    };
    const onChatHistory = (payload: { messages: ChatMessageView[] }) => {
      setState((s) => ({ ...s, chatMessages: payload.messages }));
    };
    const onStorytellerStatus = (payload: { connected: boolean }) => {
      setState((s) => ({ ...s, storytellerConnected: payload.connected }));
    };
    const onError = (payload: ErrorPayload) => {
      setState((s) => ({ ...s, lastError: payload }));
    };

    socket.on(ServerEvents.AuthOk, onAuthOk);
    socket.on(ServerEvents.LobbyUpdate, onLobbyUpdate);
    socket.on(ServerEvents.GameDistributed, onDistributed);
    socket.on(ServerEvents.GamePhaseChanged, onPhaseChanged);
    socket.on(ServerEvents.GrimoireUpdate, onGrimoireUpdate);
    socket.on(ServerEvents.PlayerSelfUpdate, onSelfUpdate);
    socket.on(ServerEvents.NominationOpened, onNominationOpened);
    socket.on(ServerEvents.NominationVoteUpdate, onNominationVoteUpdate);
    socket.on(ServerEvents.NominationClosed, onNominationClosed);
    socket.on(ServerEvents.ExecutionConfirmed, onExecutionConfirmed);
    socket.on(ServerEvents.ChatEvilMessage, onChatMessage);
    socket.on(ServerEvents.ChatEvilHistory, onChatHistory);
    socket.on(ServerEvents.StorytellerConnectionStatus, onStorytellerStatus);
    socket.on(ServerEvents.Error, onError);

    return () => {
      socket.off(ServerEvents.AuthOk, onAuthOk);
      socket.off(ServerEvents.LobbyUpdate, onLobbyUpdate);
      socket.off(ServerEvents.GameDistributed, onDistributed);
      socket.off(ServerEvents.GamePhaseChanged, onPhaseChanged);
      socket.off(ServerEvents.GrimoireUpdate, onGrimoireUpdate);
      socket.off(ServerEvents.PlayerSelfUpdate, onSelfUpdate);
      socket.off(ServerEvents.NominationOpened, onNominationOpened);
      socket.off(ServerEvents.NominationVoteUpdate, onNominationVoteUpdate);
      socket.off(ServerEvents.NominationClosed, onNominationClosed);
      socket.off(ServerEvents.ExecutionConfirmed, onExecutionConfirmed);
      socket.off(ServerEvents.ChatEvilMessage, onChatMessage);
      socket.off(ServerEvents.ChatEvilHistory, onChatHistory);
      socket.off(ServerEvents.StorytellerConnectionStatus, onStorytellerStatus);
      socket.off(ServerEvents.Error, onError);
    };
  }, [socket]);

  return state;
}
