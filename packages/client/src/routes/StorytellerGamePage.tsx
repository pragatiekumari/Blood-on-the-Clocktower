import { useState } from 'react';
import { ClientEvents } from '@clocktower/shared';
import type { Socket } from 'socket.io-client';
import type { SessionState } from '../hooks/useSession.js';
import { GrimoireTable } from '../components/grimoire/GrimoireTable.js';
import { NightOrderPanel } from '../components/grimoire/NightOrderPanel.js';
import { EvilChatPanel } from '../components/chat/EvilChatPanel.js';
import { OpenChatPanel } from '../components/chat/OpenChatPanel.js';
import { ExecutionBanner } from '../components/shared/ExecutionBanner.js';
import { GameEndedBanner } from '../components/shared/GameEndedBanner.js';
import { SeatingCircle } from '../components/seating/SeatingCircle.js';
import { Graveyard } from '../components/seating/Graveyard.js';
import { PhaseTimer } from '../components/shared/PhaseTimer.js';
import { StorytellerQuestionPanel } from '../components/questions/StorytellerQuestionPanel.js';
import { RoleReferenceSection } from '../components/reference/RoleReferenceSection.js';

interface StorytellerGamePageProps {
  socket: Socket | null;
  session: SessionState;
}

const DEFAULT_TIMER_MINUTES = 5;

export function StorytellerGamePage({ socket, session }: StorytellerGamePageProps) {
  const [abilityTarget, setAbilityTarget] = useState('');
  const [abilityText, setAbilityText] = useState('');
  const [timerMinutes, setTimerMinutes] = useState(DEFAULT_TIMER_MINUTES);
  const [showRoles, setShowRoles] = useState(false);
  const [demonKillTarget, setDemonKillTarget] = useState('');
  const [confirmingEndGame, setConfirmingEndGame] = useState(false);
  const [dismissedInheritance, setDismissedInheritance] = useState(false);

  const grimoire = session.grimoire ?? [];

  function togglePhase() {
    socket?.emit(ClientEvents.StorytellerSetPhase, {
      phase: session.phase === 'day' ? 'night' : 'day',
      timerSeconds: timerMinutes > 0 ? timerMinutes * 60 : undefined,
    });
  }

  function startTimer() {
    socket?.emit(ClientEvents.StorytellerSetTimer, { timerSeconds: timerMinutes * 60 });
  }

  function clearTimer() {
    socket?.emit(ClientEvents.StorytellerSetTimer, { timerSeconds: null });
  }

  function toggleStatus(playerId: string, key: 'poisoned' | 'drunk' | 'protected') {
    const entry = grimoire.find((g) => g.playerId === playerId);
    if (!entry) return;
    socket?.emit(ClientEvents.StorytellerSetPlayerStatus, {
      playerId,
      statusEffects: { [key]: !entry.statusEffects[key] },
    });
  }

  function markDead(playerId: string) {
    socket?.emit(ClientEvents.StorytellerMarkDead, { playerId });
  }

  function sendAbilityResult() {
    if (!abilityTarget || !abilityText.trim()) return;
    socket?.emit(ClientEvents.StorytellerShareAbilityResult, { playerId: abilityTarget, text: abilityText.trim() });
    setAbilityText('');
  }

  function closeVote() {
    if (session.nomination) {
      socket?.emit(ClientEvents.StorytellerCloseVote, { nominationId: session.nomination.nominationId });
    }
  }

  function confirmExecution() {
    if (session.nomination) {
      socket?.emit(ClientEvents.StorytellerConfirmExecution, { nominationId: session.nomination.nominationId });
    }
  }

  function answerQuestion(questionId: string, answer: string) {
    socket?.emit(ClientEvents.StorytellerAnswerQuestion, { questionId, answer });
  }

  function sendOpenChat(text: string) {
    socket?.emit(ClientEvents.ChatOpenSend, { text });
  }

  function demonKill() {
    if (!demonKillTarget) return;
    socket?.emit(ClientEvents.StorytellerDemonKill, { targetPlayerId: demonKillTarget });
    setDemonKillTarget('');
  }

  function endGame(winner: 'good' | 'evil') {
    socket?.emit(ClientEvents.StorytellerEndGame, { winner });
    setConfirmingEndGame(false);
  }

  function moveSeat(playerId: string, direction: 'left' | 'right') {
    const seated = [...grimoire].sort((a, b) => a.seatIndex - b.seatIndex);
    const index = seated.findIndex((p) => p.playerId === playerId);
    if (index === -1) return;
    const swapWith = direction === 'right' ? index + 1 : index - 1;
    const wrapped = (swapWith + seated.length) % seated.length;
    const reordered = [...seated];
    [reordered[index], reordered[wrapped]] = [reordered[wrapped]!, reordered[index]!];
    socket?.emit(ClientEvents.StorytellerReorderSeats, { orderedPlayerIds: reordered.map((p) => p.playerId) });
  }

  const executedName = session.lastExecutedPlayerId
    ? grimoire.find((g) => g.playerId === session.lastExecutedPlayerId)?.displayName
    : undefined;

  const gameEnded = session.phase === 'ended';
  const livingDemon = grimoire.find((g) => g.alive && g.characterType === 'demon');
  const inheritanceNotice =
    session.demonInherited && !dismissedInheritance ? session.demonInherited : null;
  const inheritedName = inheritanceNotice
    ? grimoire.find((g) => g.playerId === inheritanceNotice.newDemonPlayerId)?.displayName
    : undefined;

  return (
    <div className="app-shell">
      <ExecutionBanner playerId={session.lastExecutedPlayerId} eventId={session.executionEventId} displayName={executedName} />
      {session.gameResult && <GameEndedBanner result={session.gameResult} />}
      {inheritanceNotice && (
        <div className="panel" style={{ borderColor: 'var(--evil-red)', textAlign: 'center' }}>
          <p className="alignment-evil" style={{ margin: 0, fontWeight: 600 }}>
            🎭 {inheritedName ?? 'A Minion'} has secretly become the new Demon. To everyone else, they're still their
            original character — only you know the truth.
          </p>
          <button className="btn btn-inline" style={{ marginTop: 8 }} onClick={() => setDismissedInheritance(true)}>
            Got it
          </button>
        </div>
      )}

      <div className="panel header-row">
        <div>
          <h1 style={{ margin: 0 }}>Storyteller</h1>
          <p className="muted" style={{ margin: 0 }}>
            {gameEnded ? 'Game over' : session.phase === 'day' ? `Day ${session.dayNumber}` : `Night ${session.dayNumber}`}
          </p>
        </div>
        <div className="mobile-stack" style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-inline" onClick={() => setShowRoles(true)}>
            📜 Roles
          </button>
          <button className="btn btn-inline btn-primary" onClick={togglePhase} disabled={gameEnded}>
            Switch to {session.phase === 'day' ? 'Night' : 'Day'}
          </button>
        </div>
      </div>

      <PhaseTimer phaseEndsAt={session.phaseEndsAt} phase={session.phase} />

      {!gameEnded && (
        <div className="panel" style={{ borderColor: 'var(--evil-red)' }}>
          <h2 style={{ marginTop: 0 }}>Game Control</h2>
          <div className="mobile-stack" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              className="input"
              style={{ minWidth: 200 }}
              value={demonKillTarget}
              onChange={(e) => setDemonKillTarget(e.target.value)}
            >
              <option value="">Demon kills a player…</option>
              {grimoire
                .filter((g) => g.alive)
                .map((g) => (
                  <option key={g.playerId} value={g.playerId}>
                    {g.displayName}
                    {g.playerId === livingDemon?.playerId ? ' (Demon)' : ''}
                  </option>
                ))}
            </select>
            <button className="btn btn-inline btn-danger" onClick={demonKill} disabled={!demonKillTarget || !livingDemon}>
              Kill
            </button>
          </div>
          <p className="faint" style={{ marginTop: 8 }}>
            {livingDemon
              ? 'Triggers the night-kill (or self-kill, if the Demon targets themself). A self-kill hands the role to a random living Minion.'
              : 'No living Demon — the kill action is unavailable.'}
          </p>

          <div style={{ marginTop: 16, borderTop: '1px solid var(--border-color, rgba(255,255,255,0.1))', paddingTop: 16 }}>
            {!confirmingEndGame ? (
              <button className="btn btn-inline btn-danger" onClick={() => setConfirmingEndGame(true)}>
                End Game…
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span className="muted">Declare a winner:</span>
                <button className="btn btn-inline" onClick={() => endGame('good')}>
                  Good wins
                </button>
                <button className="btn btn-inline btn-danger" onClick={() => endGame('evil')}>
                  Evil wins
                </button>
                <button className="btn btn-inline" onClick={() => setConfirmingEndGame(false)}>
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="panel">
        <h2 style={{ marginTop: 0 }}>Phase Timer</h2>
        <div className="mobile-stack" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              className="input"
              type="number"
              min={1}
              max={60}
              style={{ width: 70 }}
              value={timerMinutes}
              onChange={(e) => setTimerMinutes(Math.max(1, Number(e.target.value) || 1))}
            />
            minutes
          </label>
          <button className="btn btn-inline" onClick={startTimer}>
            Start Timer
          </button>
          <button className="btn btn-inline" onClick={clearTimer} disabled={!session.phaseEndsAt}>
            Clear Timer
          </button>
        </div>
        <p className="faint" style={{ marginTop: 8 }}>
          The duration above is also used automatically when you switch phases with "Switch to Day/Night".
        </p>
      </div>

      <div className="panel">
        <h2 style={{ marginTop: 0, textAlign: 'center' }}>Seating Circle</h2>
        <p className="faint" style={{ textAlign: 'center', marginTop: -8 }}>
          Use ↺ / ↻ to swap a player with their neighbor.
        </p>
        <SeatingCircle players={grimoire} onMoveSeat={moveSeat} />
        <Graveyard players={grimoire} />
      </div>

      <div className="panel">
        <h2 style={{ marginTop: 0 }}>Grimoire</h2>
        <GrimoireTable grimoire={grimoire} onToggleStatus={toggleStatus} onMarkDead={markDead} />
      </div>

      <NightOrderPanel grimoire={grimoire} isFirstNight={session.dayNumber <= 1 && session.phase === 'night'} />

      {session.nomination && !gameEnded && (
        <div className="panel">
          <h2 style={{ marginTop: 0 }}>Active Nomination</h2>
          <p>
            {grimoire.find((g) => g.playerId === session.nomination!.nominatorId)?.displayName} nominated{' '}
            {grimoire.find((g) => g.playerId === session.nomination!.targetId)?.displayName}
          </p>
          <p>Votes for: {session.nomination.votes.filter((v) => v.voting).length}</p>
          {!session.nomination.closed ? (
            <button className="btn" onClick={closeVote}>
              Close Vote
            </button>
          ) : session.nomination.pendingExecution ? (
            <button className="btn btn-danger" onClick={confirmExecution}>
              Confirm Execution
            </button>
          ) : (
            <p className="faint">This nomination did not pass.</p>
          )}
        </div>
      )}

      <div className="panel">
        <h2 style={{ marginTop: 0 }}>Share an Ability Result</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 420 }}>
          <select className="input" value={abilityTarget} onChange={(e) => setAbilityTarget(e.target.value)}>
            <option value="">Choose a player…</option>
            {grimoire.map((g) => (
              <option key={g.playerId} value={g.playerId}>
                {g.displayName}
              </option>
            ))}
          </select>
          <input
            className="input"
            placeholder="Result text to share with them"
            value={abilityText}
            onChange={(e) => setAbilityText(e.target.value)}
          />
          <button className="btn btn-primary" onClick={sendAbilityResult} disabled={!abilityTarget || !abilityText.trim()}>
            Send
          </button>
        </div>
      </div>

      <StorytellerQuestionPanel questions={session.questionQueue} onAnswer={answerQuestion} />

      <OpenChatPanel messages={session.openChatMessages} onSend={sendOpenChat} />

      <EvilChatPanel messages={session.chatMessages} onSend={() => {}} readOnly />

      {showRoles && <RoleReferenceSection onClose={() => setShowRoles(false)} />}
    </div>
  );
}
