import { describe, expect, it } from 'vitest';
import { SessionStore, type GameSession, type PlayerRecord } from '../session/store.js';
import { checkWinCondition, endGame, tryScarletWomanTakeover } from './winConditions.js';

function makeSession(count: number): { session: GameSession; players: PlayerRecord[] } {
  const store = new SessionStore();
  const session = store.createSession('tok');
  const players: PlayerRecord[] = [];
  for (let i = 0; i < count; i++) {
    players.push(store.addPlayer(session, `p${i}`, `Player${i}`));
  }
  return { session, players };
}

function setCharacter(player: PlayerRecord, characterType: PlayerRecord['characterType'], character = 'imp') {
  player.characterType = characterType;
  player.character = characterType ? character : null;
  player.alignment = characterType === 'demon' || characterType === 'minion' ? 'evil' : 'good';
}

describe('checkWinCondition', () => {
  it('returns null while the Demon lives and more than 2 players remain', () => {
    const { session, players } = makeSession(5);
    setCharacter(players[0]!, 'demon');
    setCharacter(players[1]!, 'minion');
    setCharacter(players[2]!, 'townsfolk', 'chef');
    setCharacter(players[3]!, 'townsfolk', 'chef');
    setCharacter(players[4]!, 'outsider', 'recluse');

    expect(checkWinCondition(session, 'executed')).toBeNull();
  });

  it('declares Good the winner when the Demon has been executed and no one inherited', () => {
    const { session, players } = makeSession(5);
    setCharacter(players[0]!, 'demon');
    setCharacter(players[1]!, 'minion');
    setCharacter(players[2]!, 'townsfolk', 'chef');
    setCharacter(players[3]!, 'townsfolk', 'chef');
    setCharacter(players[4]!, 'outsider', 'recluse');
    players[0]!.alive = false; // Demon executed

    const result = checkWinCondition(session, 'executed');
    expect(result).toEqual({ winner: 'good', reason: 'demon-executed' });
  });

  it('declares Good the winner with reason demon-self-killed when the Demon self-killed with no heir', () => {
    const { session, players } = makeSession(4);
    setCharacter(players[0]!, 'demon');
    setCharacter(players[1]!, 'townsfolk', 'chef');
    setCharacter(players[2]!, 'townsfolk', 'chef');
    setCharacter(players[3]!, 'outsider', 'recluse');
    players[0]!.alive = false;

    const result = checkWinCondition(session, 'self-killed');
    expect(result).toEqual({ winner: 'good', reason: 'demon-self-killed' });
  });

  it('declares Evil the winner once only 2 players remain, even if the Demon is alive', () => {
    const { session, players } = makeSession(5);
    setCharacter(players[0]!, 'demon');
    setCharacter(players[1]!, 'minion');
    setCharacter(players[2]!, 'townsfolk', 'chef');
    setCharacter(players[3]!, 'townsfolk', 'chef');
    setCharacter(players[4]!, 'outsider', 'recluse');
    players[2]!.alive = false;
    players[3]!.alive = false;
    players[4]!.alive = false;

    const result = checkWinCondition(session, 'executed');
    expect(result).toEqual({ winner: 'evil', reason: 'two-players-left' });
  });

  it('prioritizes the two-players-left Evil win over a simultaneous no-Demon Good win', () => {
    // Edge case: last execution kills the Demon AND drops the count to 2.
    const { session, players } = makeSession(3);
    setCharacter(players[0]!, 'demon');
    setCharacter(players[1]!, 'townsfolk', 'chef');
    setCharacter(players[2]!, 'townsfolk', 'chef');
    players[0]!.alive = false;

    const result = checkWinCondition(session, 'executed');
    expect(result).toEqual({ winner: 'evil', reason: 'two-players-left' });
  });
});

describe('tryScarletWomanTakeover', () => {
  it('hands the Demon role to a living Scarlet Woman when 5+ players remain', () => {
    // 6 total so that AFTER the Demon's death, 5 players are still alive
    // (tryScarletWomanTakeover checks the living count post-death, per its docs).
    const { session, players } = makeSession(6);
    const demon = players[0]!;
    const scarletWoman = players[1]!;
    setCharacter(demon, 'demon', 'imp');
    setCharacter(scarletWoman, 'minion', 'scarlet-woman');
    setCharacter(players[2]!, 'townsfolk', 'chef');
    setCharacter(players[3]!, 'townsfolk', 'chef');
    setCharacter(players[4]!, 'outsider', 'recluse');
    setCharacter(players[5]!, 'townsfolk', 'chef');
    demon.alive = false;

    const result = tryScarletWomanTakeover(session, demon.playerId);

    expect(result).toEqual({
      previousDemonPlayerId: demon.playerId,
      newDemonPlayerId: scarletWoman.playerId,
      newDemonCharacterId: 'imp',
    });
    expect(scarletWoman.characterType).toBe('demon');
    expect(scarletWoman.character).toBe('imp');
    // Her alignment was already evil as a Minion, so it must stay evil.
    expect(scarletWoman.alignment).toBe('evil');
  });

  it('does nothing when fewer than 5 players remain alive', () => {
    const { session, players } = makeSession(4);
    const demon = players[0]!;
    const scarletWoman = players[1]!;
    setCharacter(demon, 'demon', 'imp');
    setCharacter(scarletWoman, 'minion', 'scarlet-woman');
    setCharacter(players[2]!, 'townsfolk', 'chef');
    setCharacter(players[3]!, 'outsider', 'recluse');
    demon.alive = false;

    const result = tryScarletWomanTakeover(session, demon.playerId);

    expect(result).toBeNull();
    expect(scarletWoman.characterType).toBe('minion');
  });

  it('does nothing when there is no living Scarlet Woman', () => {
    const { session, players } = makeSession(5);
    const demon = players[0]!;
    setCharacter(demon, 'demon', 'imp');
    setCharacter(players[1]!, 'minion', 'poisoner');
    setCharacter(players[2]!, 'townsfolk', 'chef');
    setCharacter(players[3]!, 'townsfolk', 'chef');
    setCharacter(players[4]!, 'outsider', 'recluse');
    demon.alive = false;

    expect(tryScarletWomanTakeover(session, demon.playerId)).toBeNull();
  });

  it('ignores a dead Scarlet Woman', () => {
    const { session, players } = makeSession(5);
    const demon = players[0]!;
    const scarletWoman = players[1]!;
    setCharacter(demon, 'demon', 'imp');
    setCharacter(scarletWoman, 'minion', 'scarlet-woman');
    setCharacter(players[2]!, 'townsfolk', 'chef');
    setCharacter(players[3]!, 'townsfolk', 'chef');
    setCharacter(players[4]!, 'outsider', 'recluse');
    demon.alive = false;
    scarletWoman.alive = false;

    expect(tryScarletWomanTakeover(session, demon.playerId)).toBeNull();
  });
});

describe('endGame', () => {
  it('sets phase to ended and stores the game result', () => {
    const { session } = makeSession(3);
    endGame(session, 'good', 'demon-executed');

    expect(session.phase).toBe('ended');
    expect(session.gameResult).toEqual({ winner: 'good', reason: 'demon-executed' });
  });
});
