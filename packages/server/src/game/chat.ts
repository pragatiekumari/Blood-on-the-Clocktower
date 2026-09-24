import type { Server as SocketIOServer } from 'socket.io';
import { ServerEvents } from '@clocktower/shared';
import type { ChatMessage, GameSession } from '../session/store.js';
import { pushChatMessage } from '../session/store.js';
import { evilRoom } from './broadcast.js';
import { Errors } from '../errors.js';

/** (Re)joins every currently-connected Evil player's socket, plus the Storyteller, to the evil chat room. */
export function syncEvilRoomMembership(io: SocketIOServer, session: GameSession): void {
  const room = evilRoom(session.code);
  for (const player of session.players.values()) {
    if (!player.connectionId) continue;
    const socket = io.sockets.sockets.get(player.connectionId);
    if (!socket) continue;
    if (player.alignment === 'evil') {
      socket.join(room);
    } else {
      socket.leave(room);
    }
  }
  if (session.storytellerConnectionId) {
    const stSocket = io.sockets.sockets.get(session.storytellerConnectionId);
    stSocket?.join(room);
  }
}

export function sendEvilMessage(
  io: SocketIOServer,
  session: GameSession,
  senderId: string,
  senderName: string,
  text: string
): ChatMessage {
  const sender = session.players.get(senderId);
  if (!sender || sender.alignment !== 'evil') {
    throw Errors.notInEvilChat();
  }
  const message: ChatMessage = { senderId, senderName, text, ts: Date.now() };
  pushChatMessage(session, message);
  io.to(evilRoom(session.code)).emit(ServerEvents.ChatEvilMessage, message);
  return message;
}

export function sendEvilHistoryTo(io: SocketIOServer, connectionId: string, session: GameSession): void {
  io.to(connectionId).emit(ServerEvents.ChatEvilHistory, { messages: session.evilChatHistory });
}
