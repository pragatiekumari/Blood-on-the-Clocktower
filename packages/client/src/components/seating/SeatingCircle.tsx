import type { GrimoirePlayerEntry } from '@clocktower/shared';
import type { LobbyPlayer } from '../../hooks/useSession.js';

type SeatEntry = LobbyPlayer | GrimoirePlayerEntry;

interface SeatingCircleProps {
  players: SeatEntry[];
  selfPlayerId?: string;
  /** Optional: render Storyteller reorder controls (swap with clockwise/counter-clockwise neighbor). */
  onMoveSeat?: (playerId: string, direction: 'left' | 'right') => void;
  size?: number;
}

function isAlive(entry: SeatEntry): boolean {
  return entry.alive;
}

function isConnected(entry: SeatEntry): boolean {
  return 'connected' in entry ? entry.connected : true;
}

/**
 * Renders players as tokens positioned around a circle by seatIndex, matching
 * the physical tabletop layout. Seating is public information in the real
 * game (everyone can see who's sitting where), so this is safe to show to
 * every player, not just the Storyteller.
 */
export function SeatingCircle({ players, selfPlayerId, onMoveSeat, size = 280 }: SeatingCircleProps) {
  const seated = [...players].sort((a, b) => a.seatIndex - b.seatIndex);
  const radius = size / 2 - 40;
  const center = size / 2;

  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        margin: '0 auto',
      }}
      role="list"
      aria-label="Seating circle"
    >
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          border: '1px dashed var(--border-subtle)',
          borderRadius: '50%',
        }}
      />
      {seated.map((entry, i) => {
        const angle = (i / seated.length) * 2 * Math.PI - Math.PI / 2;
        const x = center + radius * Math.cos(angle);
        const y = center + radius * Math.sin(angle);
        const isSelf = entry.playerId === selfPlayerId;

        return (
          <div
            key={entry.playerId}
            role="listitem"
            title={entry.displayName}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              transform: 'translate(-50%, -50%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              opacity: isAlive(entry) ? 1 : 0.45,
              width: 76,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: 15,
                background: isSelf ? 'var(--accent-gold)' : 'var(--bg-panel-raised)',
                color: isSelf ? '#1a1206' : 'var(--text-primary)',
                border: `2px solid ${isConnected(entry) ? 'var(--border-subtle)' : 'var(--danger)'}`,
                boxShadow: isSelf ? '0 0 0 3px var(--good-blue-bg)' : undefined,
              }}
            >
              {!isAlive(entry) ? '💀' : entry.displayName.slice(0, 2).toUpperCase()}
            </div>
            <span
              style={{
                fontSize: 12,
                textAlign: 'center',
                lineHeight: 1.2,
                maxWidth: 76,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {entry.displayName}
              {isSelf && <strong> (you)</strong>}
            </span>
            {onMoveSeat && (
              <div style={{ display: 'flex', gap: 2 }}>
                <button
                  className="btn btn-inline"
                  style={{ padding: '2px 6px', fontSize: 11 }}
                  aria-label={`Move ${entry.displayName} counter-clockwise`}
                  onClick={() => onMoveSeat(entry.playerId, 'left')}
                >
                  ↺
                </button>
                <button
                  className="btn btn-inline"
                  style={{ padding: '2px 6px', fontSize: 11 }}
                  aria-label={`Move ${entry.displayName} clockwise`}
                  onClick={() => onMoveSeat(entry.playerId, 'right')}
                >
                  ↻
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
