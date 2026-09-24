import { useEffect, useState } from 'react';

interface ExecutionBannerProps {
  playerId: string | null;
  eventId: number;
  displayName?: string;
}

/** Shows a brief, dramatic banner when a player is executed, then auto-dismisses. */
export function ExecutionBanner({ playerId, eventId, displayName }: ExecutionBannerProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (eventId === 0 || !playerId) return;
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 6000);
    return () => clearTimeout(timer);
    // eventId changes on every new execution, even if the same player were somehow flagged twice.
  }, [eventId, playerId]);

  if (!visible || !playerId) return null;

  return (
    <div
      role="alert"
      className="panel"
      style={{
        borderColor: 'var(--evil-red)',
        textAlign: 'center',
        background: 'var(--evil-red-bg)',
      }}
    >
      <h2 className="alignment-evil" style={{ margin: 0 }}>
        🔔 {displayName ?? 'A player'} has been executed.
      </h2>
    </div>
  );
}
