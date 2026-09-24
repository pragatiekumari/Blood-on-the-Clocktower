import { customAlphabet } from 'nanoid';
import type { Alignment, CharacterType, GamePhase, StatusEffects } from '@clocktower/shared';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no O/0/I/1 to avoid confusion
const generateCode = customAlphabet(CODE_ALPHABET, 5);

export interface PlayerRecord {
  playerId: string;
  connectionId: string | null;
  displayName: string;
  character: string | null;
  characterType: CharacterType | null;
  alignment: Alignment | null;
  alive: boolean;
  usedDeadVote: boolean;
  statusEffects: StatusEffects;
  hasNominatedToday: boolean;
  onboardingSeen: boolean;
}

export interface ActiveNomination {
  id: string;
  nominatorId: string;
  targetId: string;
  votes: Map<string, boolean>;
  openedAt: number;
  closed: boolean;
  pendingExecution: boolean;
  resolvedTally: number | null;
}

export interface ChatMessage {
  senderId: string;
  senderName: string;
  text: string;
  ts: number;
}

export interface GameSession {
  code: string;
  storytellerConnectionId: string | null;
  storytellerToken: string;
  phase: GamePhase;
  dayNumber: number;
  script: 'trouble-brewing';
  players: Map<string, PlayerRecord>;
  nomination: ActiveNomination | null;
  resolvedNominationsToday: { targetId: string; tally: number }[];
  evilChatHistory: ChatMessage[];
  createdAt: number;
  lastActivityAt: number;
}

const MAX_CHAT_HISTORY = 200;
const SESSION_IDLE_MS = 6 * 60 * 60 * 1000; // 6 hours

export class SessionStore {
  private sessions = new Map<string, GameSession>();

  createSession(storytellerToken: string): GameSession {
    let code = generateCode();
    while (this.sessions.has(code)) {
      code = generateCode();
    }
    const session: GameSession = {
      code,
      storytellerConnectionId: null,
      storytellerToken,
      phase: 'lobby',
      dayNumber: 0,
      script: 'trouble-brewing',
      players: new Map(),
      nomination: null,
      resolvedNominationsToday: [],
      evilChatHistory: [],
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
    };
    this.sessions.set(code, session);
    return session;
  }

  getSession(code: string): GameSession | undefined {
    return this.sessions.get(code.toUpperCase());
  }

  touch(session: GameSession): void {
    session.lastActivityAt = Date.now();
  }

  deleteSession(code: string): void {
    this.sessions.delete(code.toUpperCase());
  }

  isDisplayNameTaken(session: GameSession, displayName: string): boolean {
    const normalized = displayName.trim().toLowerCase();
    for (const p of session.players.values()) {
      if (p.displayName.trim().toLowerCase() === normalized) return true;
    }
    return false;
  }

  addPlayer(session: GameSession, playerId: string, displayName: string): PlayerRecord {
    const record: PlayerRecord = {
      playerId,
      connectionId: null,
      displayName,
      character: null,
      characterType: null,
      alignment: null,
      alive: true,
      usedDeadVote: false,
      statusEffects: { poisoned: false, drunk: false, protected: false },
      hasNominatedToday: false,
      onboardingSeen: false,
    };
    session.players.set(playerId, record);
    return record;
  }

  cleanupIdleSessions(): void {
    const now = Date.now();
    for (const [code, session] of this.sessions) {
      if (now - session.lastActivityAt > SESSION_IDLE_MS) {
        this.sessions.delete(code);
      }
    }
  }
}

export function pushChatMessage(session: GameSession, message: ChatMessage): void {
  session.evilChatHistory.push(message);
  if (session.evilChatHistory.length > MAX_CHAT_HISTORY) {
    session.evilChatHistory.splice(0, session.evilChatHistory.length - MAX_CHAT_HISTORY);
  }
}

export function livingPlayerCount(session: GameSession): number {
  let count = 0;
  for (const p of session.players.values()) {
    if (p.alive) count++;
  }
  return count;
}

export function evilPlayers(session: GameSession): PlayerRecord[] {
  return [...session.players.values()].filter((p) => p.alignment === 'evil');
}
