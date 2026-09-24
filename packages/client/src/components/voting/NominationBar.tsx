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
  const [confirming, setConfirming] = useState(false);
  const candidates = players.filter((p) => p.playerId !== selfPlayerId && p.alive);
  const targetName = candidates.find((p) => p.playerId === targetId)?.displayName;

  function reset() {
    setTargetId('');
    setConfirming(false);
  }

  return (
    <div className="panel">
      <h3 style={{ marginTop: 0 }}>Nominate</h3>
      {!canNominate && <p className="faint">You can't nominate right now.</p>}

      {confirming && targetId ? (
        <div>
          <p>
            Nominate <strong className="alignment-evil">{targetName}</strong> for execution? This is public and
            can't be undone.
          </p>
          <div className="mobile-stack" style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-danger"
              onClick={() => {
                onNominate(targetId);
                reset();
              }}
            >
              Confirm Nomination
            </button>
            <button className="btn" onClick={reset}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mobile-stack" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
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
            onClick={() => setConfirming(true)}
          >
            Nominate
          </button>
        </div>
      )}
    </div>
  );
}
