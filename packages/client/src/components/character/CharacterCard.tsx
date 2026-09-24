import type { Alignment, CharacterType } from '@clocktower/shared';

interface CharacterCardProps {
  characterName: string;
  characterType: CharacterType;
  alignment: Alignment;
  ability: string;
}

const TYPE_LABEL: Record<CharacterType, string> = {
  townsfolk: 'Townsfolk',
  outsider: 'Outsider',
  minion: 'Minion',
  demon: 'Demon',
};

export function CharacterCard({ characterName, characterType, alignment, ability }: CharacterCardProps) {
  return (
    <div className="panel" style={{ borderColor: alignment === 'evil' ? 'var(--evil-red)' : 'var(--good-blue)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div>
          <h2 style={{ margin: '0 0 6px' }}>{characterName}</h2>
          <span className={`badge badge-${characterType}`}>{TYPE_LABEL[characterType]}</span>
        </div>
        <span className={alignment === 'evil' ? 'alignment-evil' : 'alignment-good'} style={{ fontWeight: 700 }}>
          {alignment === 'evil' ? 'EVIL' : 'GOOD'}
        </span>
      </div>
      <p style={{ marginTop: 16, lineHeight: 1.5 }}>{ability}</p>
    </div>
  );
}
