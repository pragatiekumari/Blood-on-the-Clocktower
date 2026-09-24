import type { Server as SocketIOServer } from 'socket.io';
import { ServerEvents, type GrimoirePlayerEntry } from '@clocktower/shared';
import type { GameSession, PlayerRecord } from '../session/store.js';

export const STORYTELLER_SOCKET_KEY = '__storyteller__';

export function sessionRoom(code: string): string {
  return `session:${code}`;
}

export function evilRoom(code: string): string {
  return `session:${code}:evil`;
}

/**
 * Sends an event to a single player's current socket, if connected.
 * This is the ONLY path used for anything that could leak secret data,
 * per the design's information-hiding model.
 */
export function sendToPlayer(io: SocketIOServer, player: PlayerRecord, event: string, payload: unknown): void {
  if (player.connectionId) {
    io.to(player.connectionId).emit(event, payload);
  }
}

export function sendToStoryteller(io: SocketIOServer, session: GameSession, event: string, payload: unknown): void {
  if (session.storytellerConnectionId) {
    io.to(session.storytellerConnectionId).emit(event, payload);
  }
}

export function buildGrimoire(session: GameSession): GrimoirePlayerEntry[] {
  return [...session.players.values()].map((p) => ({
    playerId: p.playerId,
    displayName: p.displayName,
    character: p.character,
    characterType: p.characterType,
    alignment: p.alignment,
    alive: p.alive,
    statusEffects: p.statusEffects,
    usedDeadVote: p.usedDeadVote,
    connected: p.connectionId !== null,
  }));
}

export function broadcastGrimoire(io: SocketIOServer, session: GameSession): void {
  sendToStoryteller(io, session, ServerEvents.GrimoireUpdate, { grimoire: buildGrimoire(session) });
}

export function broadcastLobby(io: SocketIOServer, session: GameSession): void {
  const players = [...session.players.values()].map((p) => ({
    playerId: p.playerId,
    displayName: p.displayName,
    connected: p.connectionId !== null,
  }));
  io.to(sessionRoom(session.code)).emit(ServerEvents.LobbyUpdate, { players });
}

export function sendError(io: SocketIOServer, connectionId: string, code: string, message: string): void {
  io.to(connectionId).emit(ServerEvents.Error, { code, message });
}
