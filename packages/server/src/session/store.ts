import { customAlphabet } from 'nanoid';
import type { Alignment, CharacterType, GameEndReason, GamePhase, StatusEffects, WinningTeam } from '@clocktower/shared';

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
  /** Position around the seating circle, 0-indexed clockwise. Defaults to join order. */
  seatIndex: number;
  /** For Evil players: the one fixed bluff character id assigned at distribution time (stable across reconnects). Null for Good players or before distribution. */
  bluffCharacterId: string | null;
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

export interface QuestionEntry {
  id: string;
  playerId: string;
  playerName: string;
  text: string;
  answer: string | null;
  answered: boolean;
  askedAt: number;
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
  /** Epoch ms when the current phase's countdown ends, or null if no timer is set. */
  phaseEndsAt: number | null;
  /** Post-night question queue: Evil players' questions surface first, one at a time, gated on the Storyteller answering. */
  questionQueue: QuestionEntry[];
  /** Set once the game ends (phase becomes 'ended'), by automatic detection or a Storyteller override. */
  gameResult: { winner: WinningTeam; reason: GameEndReason } | null;
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
      phaseEndsAt: null,
      questionQueue: [],
      gameResult: null,
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
      seatIndex: session.players.size,
      bluffCharacterId: null,
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

export function playersBySeat(session: GameSession): PlayerRecord[] {
  return [...session.players.values()].sort((a, b) => a.seatIndex - b.seatIndex);
}

export interface LivingNeighbors {
  left: PlayerRecord | null;
  right: PlayerRecord | null;
}

/**
 * Finds the nearest LIVING neighbor in each direction around the fixed
 * seating circle, skipping dead players — this is exactly how neighbor-based
 * abilities (Empath, Fortune Teller, etc.) work once players are executed:
 * seat order never changes, but "neighbor" always means nearest living
 * neighbor. Returns null for a side if there are no other living players.
 */
export function livingNeighborsOf(session: GameSession, playerId: string): LivingNeighbors {
  const seated = playersBySeat(session);
  const index = seated.findIndex((p) => p.playerId === playerId);
  if (index === -1 || seated.length < 2) return { left: null, right: null };

  const n = seated.length;
  let left: PlayerRecord | null = null;
  for (let step = 1; step < n; step++) {
    const candidate = seated[(index - step + n) % n]!;
    if (candidate.alive && candidate.playerId !== playerId) {
      left = candidate;
      break;
    }
  }

  let right: PlayerRecord | null = null;
  for (let step = 1; step < n; step++) {
    const candidate = seated[(index + step) % n]!;
    if (candidate.alive && candidate.playerId !== playerId) {
      right = candidate;
      break;
    }
  }

  return { left, right };
}

/**
 * Reassigns seatIndex for every player based on the given ordered list of
 * playerIds (the new clockwise order). playerIds not present in the session
 * are ignored; players missing from the list keep their relative order,
 * appended after the reordered ones.
 */
export function reorderSeats(session: GameSession, orderedPlayerIds: string[]): void {
  let index = 0;
  const seen = new Set<string>();
  for (const playerId of orderedPlayerIds) {
    const player = session.players.get(playerId);
    if (!player || seen.has(playerId)) continue;
    player.seatIndex = index;
    index += 1;
    seen.add(playerId);
  }
  for (const player of playersBySeat(session)) {
    if (!seen.has(player.playerId)) {
      player.seatIndex = index;
      index += 1;
    }
  }
}
