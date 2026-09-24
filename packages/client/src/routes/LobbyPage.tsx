import { ClientEvents, MAX_PLAYERS, MIN_PLAYERS } from '@clocktower/shared';
import type { Socket } from 'socket.io-client';
import type { SessionState } from '../hooks/useSession.js';

interface LobbyPageProps {
  code: string;
  socket: Socket | null;
  session: SessionState;
  isStoryteller: boolean;
}

export function LobbyPage({ code, socket, session, isStoryteller }: LobbyPageProps) {
  const count = session.lobbyPlayers.length;
  const belowMin = count < MIN_PLAYERS;
  const atMax = count >= MAX_PLAYERS;

  return (
    <div className="app-shell">
      <div className="panel">
        <h1 style={{ marginTop: 0 }}>Lobby</h1>
        <p className="muted">
          Join code: <strong style={{ fontSize: 22, letterSpacing: '0.1em' }}>{code}</strong>
        </p>
        <p className="faint">Share this code with your group so they can join before the game starts.</p>
      </div>

      <div className="panel">
        <h2 style={{ marginTop: 0 }}>
          Players ({count}/{MAX_PLAYERS})
        </h2>
        {count === 0 && <p className="faint">Waiting for players to join…</p>}
        <ul style={{ paddingLeft: 20, lineHeight: 1.8 }}>
          {session.lobbyPlayers.map((p) => (
            <li key={p.playerId}>
              {p.displayName} {!p.connected && <span className="faint">(disconnected)</span>}
            </li>
          ))}
        </ul>

        {isStoryteller && (
          <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              className="btn btn-primary"
              disabled={belowMin}
              onClick={() => socket?.emit(ClientEvents.StorytellerStartDistribution)}
            >
              Start Distribution
            </button>
            {belowMin && <span className="faint">Need at least {MIN_PLAYERS} players to start.</span>}
            {atMax && <span className="faint">Lobby is at maximum capacity.</span>}
          </div>
        )}
      </div>
    </div>
  );
}
