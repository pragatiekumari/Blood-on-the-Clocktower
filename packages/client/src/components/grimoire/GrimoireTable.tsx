import type { GrimoirePlayerEntry } from '@clocktower/shared';
import { getCharacterById } from '@clocktower/shared';

interface GrimoireTableProps {
  grimoire: GrimoirePlayerEntry[];
  onToggleStatus: (playerId: string, key: 'poisoned' | 'drunk' | 'protected') => void;
  onMarkDead: (playerId: string) => void;
}

function characterName(id: string | null): string {
  if (!id) return '—';
  return getCharacterById(id)?.name ?? id;
}

export function GrimoireTable({ grimoire, onToggleStatus, onMarkDead }: GrimoireTableProps) {
  return (
    <>
      <table className="grimoire-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-subtle)' }}>
            <th style={{ padding: 8 }}>Player</th>
            <th style={{ padding: 8 }}>Character</th>
            <th style={{ padding: 8 }}>Alignment</th>
            <th style={{ padding: 8 }}>Status</th>
            <th style={{ padding: 8 }}>Alive</th>
            <th style={{ padding: 8 }}></th>
          </tr>
        </thead>
        <tbody>
          {grimoire.map((entry) => (
            <tr key={entry.playerId} style={{ borderBottom: '1px solid var(--border-subtle)', opacity: entry.alive ? 1 : 0.5 }}>
              <td style={{ padding: 8 }}>{entry.displayName}</td>
              <td style={{ padding: 8 }}>{characterName(entry.character)}</td>
              <td style={{ padding: 8 }}>
                <span className={entry.alignment === 'evil' ? 'alignment-evil' : 'alignment-good'}>
                  {entry.alignment ?? '—'}
                </span>
              </td>
              <td style={{ padding: 8 }}>
                <StatusToggles entry={entry} onToggleStatus={onToggleStatus} />
              </td>
              <td style={{ padding: 8 }}>{entry.alive ? 'Alive' : 'Dead'}</td>
              <td style={{ padding: 8 }}>
                {entry.alive && (
                  <button className="btn" onClick={() => onMarkDead(entry.playerId)}>
                    Mark Dead
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="grimoire-cards" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {grimoire.map((entry) => (
          <div key={entry.playerId} className="panel" style={{ opacity: entry.alive ? 1 : 0.5 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <strong>{entry.displayName}</strong>
              <span className={entry.alignment === 'evil' ? 'alignment-evil' : 'alignment-good'}>{entry.alignment}</span>
            </div>
            <p className="muted" style={{ margin: '4px 0' }}>
              {characterName(entry.character)} — {entry.alive ? 'Alive' : 'Dead'}
            </p>
            <StatusToggles entry={entry} onToggleStatus={onToggleStatus} />
            {entry.alive && (
              <button className="btn" style={{ marginTop: 8 }} onClick={() => onMarkDead(entry.playerId)}>
                Mark Dead
              </button>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

function StatusToggles({
  entry,
  onToggleStatus,
}: {
  entry: GrimoirePlayerEntry;
  onToggleStatus: (playerId: string, key: 'poisoned' | 'drunk' | 'protected') => void;
}) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {(['poisoned', 'drunk', 'protected'] as const).map((key) => (
        <label key={key} style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
          <input
            type="checkbox"
            checked={entry.statusEffects[key]}
            onChange={() => onToggleStatus(entry.playerId, key)}
          />
          {key}
        </label>
      ))}
    </div>
  );
}
