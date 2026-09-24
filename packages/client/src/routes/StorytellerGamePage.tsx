import { useState } from 'react';
import { ClientEvents } from '@clocktower/shared';
import type { Socket } from 'socket.io-client';
import type { SessionState } from '../hooks/useSession.js';
import { GrimoireTable } from '../components/grimoire/GrimoireTable.js';
import { NightOrderPanel } from '../components/grimoire/NightOrderPanel.js';
import { EvilChatPanel } from '../components/chat/EvilChatPanel.js';
import { ExecutionBanner } from '../components/shared/ExecutionBanner.js';
import { SeatingCircle } from '../components/seating/SeatingCircle.js';

interface StorytellerGamePageProps {
  socket: Socket | null;
  session: SessionState;
}

export function StorytellerGamePage({ socket, session }: StorytellerGamePageProps) {
  const [abilityTarget, setAbilityTarget] = useState('');
  const [abilityText, setAbilityText] = useState('');

  const grimoire = session.grimoire ?? [];

  function togglePhase() {
    socket?.emit(ClientEvents.StorytellerSetPhase, { phase: session.phase === 'day' ? 'night' : 'day' });
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

  return (
    <div className="app-shell">
      <ExecutionBanner playerId={session.lastExecutedPlayerId} eventId={session.executionEventId} displayName={executedName} />

      <div className="panel header-row">
        <div>
          <h1 style={{ margin: 0 }}>Storyteller</h1>
          <p className="muted" style={{ margin: 0 }}>
            {session.phase === 'day' ? `Day ${session.dayNumber}` : `Night ${session.dayNumber}`}
          </p>
        </div>
        <button className="btn btn-inline btn-primary" onClick={togglePhase}>
          Switch to {session.phase === 'day' ? 'Night' : 'Day'}
        </button>
      </div>

      <div className="panel">
        <h2 style={{ marginTop: 0, textAlign: 'center' }}>Seating Circle</h2>
        <p className="faint" style={{ textAlign: 'center', marginTop: -8 }}>
          Use ↺ / ↻ to swap a player with their neighbor.
        </p>
        <SeatingCircle players={grimoire} onMoveSeat={moveSeat} />
      </div>

      <div className="panel">
        <h2 style={{ marginTop: 0 }}>Grimoire</h2>
        <GrimoireTable grimoire={grimoire} onToggleStatus={toggleStatus} onMarkDead={markDead} />
      </div>

      <NightOrderPanel grimoire={grimoire} isFirstNight={session.dayNumber <= 1 && session.phase === 'night'} />

      {session.nomination && (
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

      <EvilChatPanel messages={session.chatMessages} onSend={() => {}} readOnly />
    </div>
  );
}
