import { useState } from 'react';
import { ClientEvents } from '@clocktower/shared';
import type { Socket } from 'socket.io-client';
import type { SessionState } from '../hooks/useSession.js';
import { CharacterCard } from '../components/character/CharacterCard.js';
import { NominationBar } from '../components/voting/NominationBar.js';
import { VoteTally } from '../components/voting/VoteTally.js';
import { EvilChatPanel } from '../components/chat/EvilChatPanel.js';
import { RulesReferencePanel } from '../components/onboarding/RulesReferencePanel.js';
import { ExecutionBanner } from '../components/shared/ExecutionBanner.js';
import { SeatingCircle } from '../components/seating/SeatingCircle.js';
import type { LobbyPlayer } from '../hooks/useSession.js';

function SeatingCirclePanel({ players, selfPlayerId }: { players: LobbyPlayer[]; selfPlayerId: string }) {
  return (
    <div className="panel">
      <h3 style={{ marginTop: 0, textAlign: 'center' }}>Seating Circle</h3>
      <SeatingCircle players={players} selfPlayerId={selfPlayerId} />
    </div>
  );
}

interface PlayerGamePageProps {
  socket: Socket | null;
  session: SessionState;
  selfPlayerId: string;
}

type Tab = 'character' | 'town' | 'chat';

export function PlayerGamePage({ socket, session, selfPlayerId }: PlayerGamePageProps) {
  const [tab, setTab] = useState<Tab>('character');
  const [showRules, setShowRules] = useState(false);
  const [showSeating, setShowSeating] = useState(false);

  const distribution = session.distribution;
  const isEvil = distribution?.role === 'player' && distribution.alignment === 'evil';
  const canNominate = session.phase === 'day' && session.alive && !session.nomination;
  const canVote = session.phase === 'day' && !session.nomination?.closed;

  function nominate(targetPlayerId: string) {
    socket?.emit(ClientEvents.PlayerNominate, { targetPlayerId });
  }

  function vote(voting: boolean) {
    if (session.nomination) {
      socket?.emit(ClientEvents.PlayerVote, { nominationId: session.nomination.nominationId, voting });
    }
  }

  function sendChat(text: string) {
    socket?.emit(ClientEvents.ChatEvilSend, { text });
  }

  const executedName = session.lastExecutedPlayerId
    ? session.lobbyPlayers.find((p) => p.playerId === session.lastExecutedPlayerId)?.displayName
    : undefined;

  return (
    <div className="app-shell">
      <ExecutionBanner playerId={session.lastExecutedPlayerId} eventId={session.executionEventId} displayName={executedName} />

      <div className="panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0 }}>
            {session.phase === 'day' ? `Day ${session.dayNumber}` : `Night ${session.dayNumber}`}
          </h1>
          {!session.alive && <p className="alignment-evil" style={{ margin: 0 }}>You are dead. You may still vote once.</p>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-inline" onClick={() => setShowSeating(true)}>
            🪑 Seating
          </button>
          <button className="btn btn-inline" onClick={() => setShowRules(true)}>
            Rules
          </button>
        </div>
      </div>

      <div className="tab-bar">
        <button className={tab === 'character' ? 'active' : ''} onClick={() => setTab('character')}>
          My Character
        </button>
        <button className={tab === 'town' ? 'active' : ''} onClick={() => setTab('town')}>
          Town Square
        </button>
        {isEvil && (
          <button className={tab === 'chat' ? 'active' : ''} onClick={() => setTab('chat')}>
            Evil Chat
          </button>
        )}
      </div>

      {tab === 'character' && distribution?.role === 'player' && (
        <div>
          <CharacterCard
            characterName={distribution.characterName}
            characterType={distribution.characterType}
            alignment={distribution.alignment}
            ability={distribution.ability}
          />
          {session.abilityResult && (
            <div className="panel">
              <h3 style={{ marginTop: 0 }}>Storyteller Update</h3>
              <p>{session.abilityResult}</p>
            </div>
          )}
          {isEvil && distribution.teammates && distribution.teammates.length > 0 && (
            <div className="panel" style={{ borderColor: 'var(--evil-red)' }}>
              <h3 style={{ marginTop: 0 }} className="alignment-evil">
                Your Fellow Evil Players
              </h3>
              <ul>
                {distribution.teammates.map((t) => (
                  <li key={t.playerId}>
                    {t.displayName} — {t.characterName}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {isEvil && distribution.bluffs && distribution.bluffs.length > 0 && (
            <div className="panel">
              <h3 style={{ marginTop: 0 }}>Bluffs (Not In Play)</h3>
              <ul>
                {distribution.bluffs.map((b) => (
                  <li key={b.id}>{b.name}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {tab === 'town' && (
        <div>
          <SeatingCirclePanel players={session.lobbyPlayers} selfPlayerId={selfPlayerId} />
          {session.nomination ? (
            <VoteTally
              nomination={session.nomination}
              players={session.lobbyPlayers}
              selfPlayerId={selfPlayerId}
              canVote={canVote}
              onVote={vote}
            />
          ) : (
            <NominationBar
              players={session.lobbyPlayers}
              selfPlayerId={selfPlayerId}
              canNominate={canNominate}
              onNominate={nominate}
            />
          )}
        </div>
      )}

      {tab === 'chat' && isEvil && (
        <EvilChatPanel messages={session.chatMessages} selfPlayerId={selfPlayerId} onSend={sendChat} />
      )}

      <div className="bottom-tab-bar">
        <button className={tab === 'character' ? 'active' : ''} onClick={() => setTab('character')}>
          Character
        </button>
        <button className={tab === 'town' ? 'active' : ''} onClick={() => setTab('town')}>
          Town
        </button>
        {isEvil && (
          <button className={tab === 'chat' ? 'active' : ''} onClick={() => setTab('chat')}>
            Chat
          </button>
        )}
      </div>

      {showRules && (
        <RulesReferencePanel
          onClose={() => setShowRules(false)}
          characterName={distribution?.role === 'player' ? distribution.characterName : undefined}
          ability={distribution?.role === 'player' ? distribution.ability : undefined}
        />
      )}

      {showSeating && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(5,5,8,0.82)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 500,
            padding: 16,
          }}
        >
          <div className="panel modal-panel" style={{ maxWidth: 360 }}>
            <h2 style={{ textAlign: 'center', marginTop: 0 }}>Seating Circle</h2>
            <SeatingCircle players={session.lobbyPlayers} selfPlayerId={selfPlayerId} />
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowSeating(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
