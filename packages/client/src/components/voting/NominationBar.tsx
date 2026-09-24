import { useState } from 'react';
import type { LobbyPlayer } from '../../hooks/useSession.js';

interface NominationBarProps {
  players: LobbyPlayer[];
  selfPlayerId: string;
  canNominate: boolean;
  onNominate: (targetPlayerId: string) => void;
}

export function NominationBar({ players, selfPlayerId, canNominate, onNominate }: NominationBarProps) {
  const [targetId, setTargetId] = useState('');
  const candidates = players.filter((p) => p.playerId !== selfPlayerId);

  return (
    <div className="panel">
      <h3 style={{ marginTop: 0 }}>Nominate</h3>
      {!canNominate && <p className="faint">You can't nominate right now.</p>}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <select
          className="input"
          style={{ flex: 1 }}
          value={targetId}
          onChange={(e) => setTargetId(e.target.value)}
          disabled={!canNominate}
        >
          <option value="">Choose a player…</option>
          {candidates.map((p) => (
            <option key={p.playerId} value={p.playerId}>
              {p.displayName}
            </option>
          ))}
        </select>
        <button
          className="btn btn-primary"
          disabled={!canNominate || !targetId}
          onClick={() => {
            if (targetId) {
              onNominate(targetId);
              setTargetId('');
            }
          }}
        >
          Nominate
        </button>
      </div>
    </div>
  );
}
