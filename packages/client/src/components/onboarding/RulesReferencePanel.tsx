import { CORE_RULES } from '@clocktower/shared';

interface RulesReferencePanelProps {
  onClose: () => void;
  characterName?: string;
  ability?: string;
}

/** In-game rules/character reference, reachable without leaving the current screen. */
export function RulesReferencePanel({ onClose, characterName, ability }: RulesReferencePanelProps) {
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
      <div className="panel" style={{ maxWidth: 480 }}>
        <h2>Quick Reference</h2>
        <ul style={{ lineHeight: 1.7, paddingLeft: 20 }}>
          {CORE_RULES.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
        {characterName && ability && (
          <>
            <h3 style={{ marginTop: 20 }}>{characterName}</h3>
            <p className="muted">{ability}</p>
          </>
        )}
        <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
