export type CharacterType = 'townsfolk' | 'outsider' | 'minion' | 'demon';
export type Alignment = 'good' | 'evil';

export interface CharacterDefinition {
  id: string;
  name: string;
  type: CharacterType;
  alignment: Alignment;
  ability: string;
  firstNightOrder: number | null;
  otherNightOrder: number | null;
}

export interface DistributionCounts {
  townsfolk: number;
  outsider: number;
  minion: number;
  demon: number;
}
