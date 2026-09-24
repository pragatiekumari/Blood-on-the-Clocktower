import type { CharacterDefinition } from './types.js';

/**
 * The Trouble Brewing script: 13 Townsfolk, 4 Outsiders, 4 Minions, 1 Demon.
 * Ability text and night order are sourced from the official Blood on the
 * Clocktower Trouble Brewing character sheet (bloodontheclocktower.com).
 */
export const TROUBLE_BREWING_CHARACTERS: CharacterDefinition[] = [
  // Townsfolk
  {
    id: 'washerwoman',
    name: 'Washerwoman',
    type: 'townsfolk',
    alignment: 'good',
    ability: 'You start knowing that 1 of 2 players is a particular Townsfolk.',
    firstNightOrder: 1,
    otherNightOrder: null,
  },
  {
    id: 'librarian',
    name: 'Librarian',
    type: 'townsfolk',
    alignment: 'good',
    ability: 'You start knowing that 1 of 2 players is a particular Outsider. (Or that zero are in play.)',
    firstNightOrder: 2,
    otherNightOrder: null,
  },
  {
    id: 'investigator',
    name: 'Investigator',
    type: 'townsfolk',
    alignment: 'good',
    ability: 'You start knowing that 1 of 2 players is a particular Minion.',
    firstNightOrder: 3,
    otherNightOrder: null,
  },
  {
    id: 'chef',
    name: 'Chef',
    type: 'townsfolk',
    alignment: 'good',
    ability: 'You start knowing how many pairs of evil players there are.',
    firstNightOrder: 4,
    otherNightOrder: null,
  },
  {
    id: 'empath',
    name: 'Empath',
    type: 'townsfolk',
    alignment: 'good',
    ability: 'Each night, you learn how many of your 2 alive neighbours are evil.',
    firstNightOrder: 5,
    otherNightOrder: 1,
  },
  {
    id: 'fortune-teller',
    name: 'Fortune Teller',
    type: 'townsfolk',
    alignment: 'good',
    ability:
      'Each night, choose 2 players: you learn if either is a Demon. There is a good player that registers as a Demon to you.',
    firstNightOrder: 6,
    otherNightOrder: 2,
  },
  {
    id: 'undertaker',
    name: 'Undertaker',
    type: 'townsfolk',
    alignment: 'good',
    ability: 'Each night*, you learn which character died by execution today.',
    firstNightOrder: null,
    otherNightOrder: 3,
  },
  {
    id: 'monk',
    name: 'Monk',
    type: 'townsfolk',
    alignment: 'good',
    ability: 'Each night*, choose a player (not yourself): they are safe from the Demon tonight.',
    firstNightOrder: null,
    otherNightOrder: 4,
  },
  {
    id: 'ravenkeeper',
    name: 'Ravenkeeper',
    type: 'townsfolk',
    alignment: 'good',
    ability:
      'If you die at night, you are woken to choose a player: you learn their character.',
    firstNightOrder: null,
    otherNightOrder: 5,
  },
  {
    id: 'virgin',
    name: 'Virgin',
    type: 'townsfolk',
    alignment: 'good',
    ability:
      'The 1st time you are nominated, if the nominator is a Townsfolk, they are executed immediately.',
    firstNightOrder: null,
    otherNightOrder: null,
  },
  {
    id: 'slayer',
    name: 'Slayer',
    type: 'townsfolk',
    alignment: 'good',
    ability: 'Once per game, during the day, publicly choose a player: if they are the Demon, they die.',
    firstNightOrder: null,
    otherNightOrder: null,
  },
  {
    id: 'soldier',
    name: 'Soldier',
    type: 'townsfolk',
    alignment: 'good',
    ability: 'You are safe from the Demon.',
    firstNightOrder: null,
    otherNightOrder: null,
  },
  {
    id: 'mayor',
    name: 'Mayor',
    type: 'townsfolk',
    alignment: 'good',
    ability:
      'If only 3 players live & no execution occurs, your team wins. If you die at night, another player might die instead.',
    firstNightOrder: null,
    otherNightOrder: null,
  },

  // Outsiders
  {
    id: 'butler',
    name: 'Butler',
    type: 'outsider',
    alignment: 'good',
    ability: 'Each night, choose a player (not yourself): tomorrow, you may only vote if they are voting too.',
    firstNightOrder: 7,
    otherNightOrder: 6,
  },
  {
    id: 'drunk',
    name: 'Drunk',
    type: 'outsider',
    alignment: 'good',
    ability:
      'You do not know you are the Drunk. You think you are a Townsfolk character, but you are not.',
    firstNightOrder: null,
    otherNightOrder: null,
  },
  {
    id: 'recluse',
    name: 'Recluse',
    type: 'outsider',
    alignment: 'good',
    ability: 'You might register as evil & as a Minion or Demon, even if dead.',
    firstNightOrder: null,
    otherNightOrder: null,
  },
  {
    id: 'saint',
    name: 'Saint',
    type: 'outsider',
    alignment: 'good',
    ability: 'If you die by execution, your team loses.',
    firstNightOrder: null,
    otherNightOrder: null,
  },

  // Minions
  {
    id: 'poisoner',
    name: 'Poisoner',
    type: 'minion',
    alignment: 'evil',
    ability: 'Each night, choose a player: they are poisoned tonight and tomorrow day.',
    firstNightOrder: 0,
    otherNightOrder: 0,
  },
  {
    id: 'spy',
    name: 'Spy',
    type: 'minion',
    alignment: 'evil',
    ability:
      'Each night, you see the Grimoire. You might register as good & as a Townsfolk or Outsider, even if dead.',
    firstNightOrder: 8,
    otherNightOrder: 7,
  },
  {
    id: 'scarlet-woman',
    name: 'Scarlet Woman',
    type: 'minion',
    alignment: 'evil',
    ability:
      'If there are 5 or more players alive & the Demon dies, you become the Demon.',
    firstNightOrder: null,
    otherNightOrder: null,
  },
  {
    id: 'baron',
    name: 'Baron',
    type: 'minion',
    alignment: 'evil',
    ability: 'There are extra Outsiders in play. [+2 Outsiders]',
    firstNightOrder: null,
    otherNightOrder: null,
  },

  // Demon
  {
    id: 'imp',
    name: 'Imp',
    type: 'demon',
    alignment: 'evil',
    ability:
      'Each night*, choose a player: they die. If you kill yourself this way, a Minion becomes the Imp.',
    firstNightOrder: null,
    otherNightOrder: 8,
  },
];

export function getCharacterById(id: string): CharacterDefinition | undefined {
  return TROUBLE_BREWING_CHARACTERS.find((c) => c.id === id);
}

export function charactersByType(type: CharacterDefinition['type']): CharacterDefinition[] {
  return TROUBLE_BREWING_CHARACTERS.filter((c) => c.type === type);
}
