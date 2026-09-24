import { TROUBLE_BREWING_CHARACTERS, type GrimoirePlayerEntry } from '@clocktower/shared';

interface NightOrderPanelProps {
  grimoire: GrimoirePlayerEntry[];
  isFirstNight: boolean;
}

export function NightOrderPanel({ grimoire, isFirstNight }: NightOrderPanelProps) {
  const inPlayIds = new Set(grimoire.map((g) => g.character).filter((c): c is string => c !== null));
  const orderKey = isFirstNight ? 'firstNightOrder' : 'otherNightOrder';

  const ordered = TROUBLE_BREWING_CHARACTERS.filter((c) => inPlayIds.has(c.id) && c[orderKey] !== null).sort(
    (a, b) => (a[orderKey] as number) - (b[orderKey] as number)
  );

  return (
    <div className="panel">
      <h3 style={{ marginTop: 0 }}>{isFirstNight ? 'First Night Order' : 'Night Order'}</h3>
      {ordered.length === 0 ? (
        <p className="faint">No characters wake tonight.</p>
      ) : (
        <ol style={{ paddingLeft: 20, lineHeight: 1.6 }}>
          {ordered.map((c) => (
            <li key={c.id}>{c.name}</li>
          ))}
        </ol>
      )}
    </div>
  );
}
