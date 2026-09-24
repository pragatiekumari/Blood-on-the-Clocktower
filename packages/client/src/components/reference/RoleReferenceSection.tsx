import { TROUBLE_BREWING_CHARACTERS } from '@clocktower/shared';
import type { CharacterType } from '@clocktower/shared';

interface RoleReferenceSectionProps {
  onClose: () => void;
}

const GROUP_ORDER: CharacterType[] = ['townsfolk', 'outsider', 'minion', 'demon'];
const GROUP_LABEL: Record<CharacterType, string> = {
  townsfolk: 'Townsfolk',
  outsider: 'Outsiders',
  minion: 'Minions',
  demon: 'Demon',
};

/**
 * Static, always-accessible reference listing every Trouble Brewing role
 * with a one-line description of its responsibility/ability. This is public
 * game knowledge (printed on the physical character sheets) — it never
 * reveals who has which character, only what each character does.
 */
export function RoleReferenceSection({ onClose }: RoleReferenceSectionProps) {
  return (
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
      <div className="panel modal-panel" style={{ maxWidth: 560 }}>
        <h2 style={{ marginTop: 0 }}>Role Reference</h2>
        <p className="faint" style={{ marginTop: -8 }}>
          Every character in Trouble Brewing and what they do. This doesn't reveal who has which role.
        </p>

        {GROUP_ORDER.map((type) => (
          <div key={type} style={{ marginTop: 16 }}>
            <h3
              className={type === 'minion' || type === 'demon' ? 'alignment-evil' : 'alignment-good'}
              style={{ marginBottom: 8 }}
            >
              {GROUP_LABEL[type]}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {TROUBLE_BREWING_CHARACTERS.filter((c) => c.type === type).map((c) => (
                <div key={c.id}>
                  <strong>{c.name}</strong>
                  <span className="muted"> — {c.ability}</span>
                </div>
              ))}
            </div>
          </div>
        ))}

        <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
