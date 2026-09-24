import type { ConnectionStatus } from '../../hooks/useGameSocket.js';

interface ConnectionBannerProps {
  status: ConnectionStatus;
}

/**
 * Makes reconnect churn visible instead of silent. Socket.IO reconnecting in
 * the background (e.g. a proxy dropping a long-lived WebSocket, or a free
 * hosting tier recycling an idle connection) re-fetches all game state,
 * which otherwise looks exactly like an unexplained page refresh.
 */
export function ConnectionBanner({ status }: ConnectionBannerProps) {
  if (status === 'connected') return null;

  const isInitialConnect = status === 'connecting';

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: '8px 16px',
        marginBottom: 12,
        borderRadius: 999,
        background: 'var(--evil-red-bg)',
        border: '1px solid var(--evil-red)',
        fontWeight: 600,
        fontSize: 14,
      }}
    >
      <span aria-hidden="true">⚠️</span>
      <span className="alignment-evil">
        {isInitialConnect
          ? 'Connecting to the game server…'
          : "Reconnecting — your connection dropped, don't worry, your game state is safe."}
      </span>
    </div>
  );
}
