import type { Alignment, CharacterType } from '../scriptData/types.js';

export type GamePhase = 'lobby' | 'day' | 'night' | 'ended';

export interface StatusEffects {
  poisoned: boolean;
  drunk: boolean;
  protected: boolean;
}

/** Public-safe lobby entry (no secret data). */
export interface LobbyPlayerSummary {
  playerId: string;
  displayName: string;
  connected: boolean;
  /** Position around the seating circle, 0-indexed clockwise. Public info — seating is visible to everyone. */
  seatIndex: number;
}

/** Full Grimoire entry — Storyteller-only. */
export interface GrimoirePlayerEntry {
  playerId: string;
  displayName: string;
  character: string | null;
  characterType: CharacterType | null;
  alignment: Alignment | null;
  alive: boolean;
  statusEffects: StatusEffects;
  usedDeadVote: boolean;
  connected: boolean;
  seatIndex: number;
}

/** What a single player's own client receives about themself. */
export interface OwnCharacterPayload {
  role: 'player';
  playerId: string;
  character: string;
  characterName: string;
  characterType: CharacterType;
  alignment: Alignment;
  ability: string;
  teammates?: { playerId: string; displayName: string; character: string; characterName: string }[];
  bluffs?: { id: string; name: string }[];
}

export interface StorytellerDistributionPayload {
  role: 'storyteller';
  grimoire: GrimoirePlayerEntry[];
}

export type DistributionPayload = OwnCharacterPayload | StorytellerDistributionPayload;

export interface NominationVote {
  playerId: string;
  voting: boolean;
}

export interface ActiveNominationView {
  nominationId: string;
  nominatorId: string;
  targetId: string;
  votes: NominationVote[];
  closed: boolean;
  pendingExecution: boolean;
}
