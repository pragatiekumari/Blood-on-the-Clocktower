import type { Socket } from 'socket.io';
import { verifyToken, type TokenPayload } from '../session/tokens.js';
import type { SessionStore } from '../session/store.js';
import type { GameSession, PlayerRecord } from '../session/store.js';
import { Errors } from '../errors.js';

export interface AuthenticatedIdentity {
  session: GameSession;
  isStoryteller: boolean;
  player: PlayerRecord | null;
}

/** Resolves a signed token to a session + identity, binding this socket as the current connection for that identity. */
export function resolveAndBind(store: SessionStore, socket: Socket, token: string): AuthenticatedIdentity {
  let payload: TokenPayload;
  try {
    payload = verifyToken(token);
  } catch {
    throw Errors.invalidToken();
  }

  const session = store.getSession(payload.sessionCode);
  if (!session) {
    throw Errors.invalidJoinCode();
  }

  if (payload.role === 'storyteller') {
    if (session.storytellerToken !== token) {
      throw Errors.invalidToken();
    }
    session.storytellerConnectionId = socket.id;
    return { session, isStoryteller: true, player: null };
  }

  const player = session.players.get(payload.playerId);
  if (!player) {
    throw Errors.playerNotFound();
  }
  player.connectionId = socket.id;
  return { session, isStoryteller: false, player };
}
