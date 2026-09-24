import type { GrimoirePlayerEntry } from '@clocktower/shared';
import type { LobbyPlayer } from '../../hooks/useSession.js';

type SeatEntry = LobbyPlayer | GrimoirePlayerEntry;

interface GraveyardProps {
  players: SeatEntry[];
}

/**
 * Lists dead players outside the seating circle for quick scanning, separate
 * from their (unchanged) seat position within the circle itself — seat
 * position must stay fixed even after death so neighbor-based abilities
 * keep working correctly.
 */
export function Graveyard({ players }: GraveyardProps) {
  const dead = [...players].filter((p) => !p.alive).sort((a, b) => a.seatIndex - b.seatIndex);

  if (dead.length === 0) {
    return (
      <p className="faint" style={{ textAlign: 'center', marginTop: 12 }}>
        No one has died yet.
      </p>
    );
  }

  return (
    <div style={{ marginTop: 16 }}>
      <p className="faint" style={{ textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 12 }}>
        Graveyard
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
        {dead.map((p) => (
          <span
            key={p.playerId}
            className="badge"
            style={{ background: 'var(--bg-panel-raised)', border: '1px solid var(--border-subtle)' }}
          >
            💀 {p.displayName}
          </span>
        ))}
      </div>
    </div>
  );
}
