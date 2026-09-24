import { describe, expect, it } from 'vitest';
import { SessionStore, type GameSession, type PlayerRecord } from '../session/store.js';
import { characterName, resolveDemonKill } from './demonKill.js';

function makeSession(count: number): { session: GameSession; players: PlayerRecord[] } {
  const store = new SessionStore();
  const session = store.createSession('tok');
  const players: PlayerRecord[] = [];
  for (let i = 0; i < count; i++) {
    players.push(store.addPlayer(session, `p${i}`, `Player${i}`));
  }
  return { session, players };
}

function setCharacter(player: PlayerRecord, characterType: PlayerRecord['characterType'], character: string) {
  player.characterType = characterType;
  player.character = character;
  player.alignment = characterType === 'demon' || characterType === 'minion' ? 'evil' : 'good';
}

describe('resolveDemonKill', () => {
  it('kills the target and returns no inheritance for a normal night kill', () => {
    const { session, players } = makeSession(4);
    const demon = players[0]!;
    const victim = players[1]!;
    setCharacter(demon, 'demon', 'imp');
    setCharacter(victim, 'townsfolk', 'chef');
    setCharacter(players[2]!, 'minion', 'poisoner');
    setCharacter(players[3]!, 'townsfolk', 'chef');

    const result = resolveDemonKill(session, demon.playerId, victim.playerId);

    expect(result).toEqual({ targetPlayerId: victim.playerId, inheritance: null });
    expect(victim.alive).toBe(false);
    expect(demon.alive).toBe(true);
    // The killer's own character is untouched by a kill of someone else.
    expect(demon.characterType).toBe('demon');
  });

  it('self-kill with exactly one living Minion hands them the Demon role while preserving their public identity', () => {
    const { session, players } = makeSession(4);
    const demon = players[0]!;
    const minion = players[1]!;
    setCharacter(demon, 'demon', 'imp');
    setCharacter(minion, 'minion', 'poisoner');
    setCharacter(players[2]!, 'townsfolk', 'chef');
    setCharacter(players[3]!, 'townsfolk', 'chef');

    const result = resolveDemonKill(session, demon.playerId, demon.playerId);

    expect(demon.alive).toBe(false);
    expect(result.targetPlayerId).toBe(demon.playerId);
    expect(result.inheritance).toEqual({
      previousDemonPlayerId: demon.playerId,
      newDemonPlayerId: minion.playerId,
      newDemonCharacterId: 'imp',
    });
    // Internally the Minion is now the real Demon...
    expect(minion.characterType).toBe('demon');
    expect(minion.character).toBe('imp');
    expect(minion.alignment).toBe('evil');
    // ...but characterName (what others see) reflects the inherited id, not
    // a fresh "Poisoner is now the Imp" reveal — the public claim is untouched
    // because nothing in the player-facing distribution payload changes for
    // anyone except the heir's own client and the Storyteller.
    expect(characterName(minion.character)).toBe('Imp');
  });

  it('self-kill with multiple living Minions picks exactly one of them as heir', () => {
    const { session, players } = makeSession(5);
    const demon = players[0]!;
    const minionA = players[1]!;
    const minionB = players[2]!;
    setCharacter(demon, 'demon', 'imp');
    setCharacter(minionA, 'minion', 'poisoner');
    setCharacter(minionB, 'minion', 'baron');
    setCharacter(players[3]!, 'townsfolk', 'chef');
    setCharacter(players[4]!, 'townsfolk', 'chef');

    const result = resolveDemonKill(session, demon.playerId, demon.playerId);

    expect(result.inheritance).not.toBeNull();
    const heirId = result.inheritance!.newDemonPlayerId;
    expect([minionA.playerId, minionB.playerId]).toContain(heirId);

    const heir = heirId === minionA.playerId ? minionA : minionB;
    const nonHeir = heirId === minionA.playerId ? minionB : minionA;
    expect(heir.characterType).toBe('demon');
    expect(heir.character).toBe('imp');
    // The Minion who was NOT chosen stays exactly as they were.
    expect(nonHeir.characterType).toBe('minion');
  });

  it('self-kill with no living Minions leaves the game with no Demon at all', () => {
    const { session, players } = makeSession(3);
    const demon = players[0]!;
    setCharacter(demon, 'demon', 'imp');
    setCharacter(players[1]!, 'townsfolk', 'chef');
    setCharacter(players[2]!, 'townsfolk', 'chef');

    const result = resolveDemonKill(session, demon.playerId, demon.playerId);

    expect(result).toEqual({ targetPlayerId: demon.playerId, inheritance: null });
    expect(demon.alive).toBe(false);
  });

  it('self-kill ignores dead Minions as heir candidates', () => {
    const { session, players } = makeSession(4);
    const demon = players[0]!;
    const deadMinion = players[1]!;
    setCharacter(demon, 'demon', 'imp');
    setCharacter(deadMinion, 'minion', 'poisoner');
    deadMinion.alive = false;
    setCharacter(players[2]!, 'townsfolk', 'chef');
    setCharacter(players[3]!, 'townsfolk', 'chef');

    const result = resolveDemonKill(session, demon.playerId, demon.playerId);

    expect(result.inheritance).toBeNull();
  });

  it('throws if the killer is not the (living) Demon', () => {
    const { session, players } = makeSession(3);
    const notDemon = players[0]!;
    const victim = players[1]!;
    setCharacter(notDemon, 'townsfolk', 'chef');
    setCharacter(victim, 'townsfolk', 'chef');
    setCharacter(players[2]!, 'outsider', 'recluse');

    expect(() => resolveDemonKill(session, notDemon.playerId, victim.playerId)).toThrow();
  });

  it('throws if the target is already dead', () => {
    const { session, players } = makeSession(3);
    const demon = players[0]!;
    const deadVictim = players[1]!;
    setCharacter(demon, 'demon', 'imp');
    setCharacter(deadVictim, 'townsfolk', 'chef');
    deadVictim.alive = false;
    setCharacter(players[2]!, 'outsider', 'recluse');

    expect(() => resolveDemonKill(session, demon.playerId, deadVictim.playerId)).toThrow();
  });
});
