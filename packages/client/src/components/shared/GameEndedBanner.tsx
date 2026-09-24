import type { GameEndedPayload } from '@clocktower/shared';

interface GameEndedBannerProps {
  result: GameEndedPayload;
}

const REASON_TEXT: Record<GameEndedPayload['reason'], string> = {
  'demon-executed': 'The Demon was executed.',
  'demon-self-killed': 'The Demon killed themself, and no Minion could inherit the role.',
  'two-players-left': 'Only two players remain.',
  'storyteller-ended': 'The Storyteller ended the game.',
};

/** Persistent full-width banner announcing the winning team once the game has ended. */
export function GameEndedBanner({ result }: GameEndedBannerProps) {
  const isGood = result.winner === 'good';

  return (
    <div
      role="alert"
      className="panel"
      style={{
        borderColor: isGood ? 'var(--good-blue)' : 'var(--evil-red)',
        background: isGood ? 'var(--good-blue-bg)' : 'var(--evil-red-bg)',
        textAlign: 'center',
      }}
    >
      <h2 className={isGood ? 'alignment-good' : 'alignment-evil'} style={{ margin: 0 }}>
        🏆 {isGood ? 'Good' : 'Evil'} wins!
      </h2>
      <p className="muted" style={{ margin: '4px 0 0' }}>
        {REASON_TEXT[result.reason]}
      </p>
    </div>
  );
}
