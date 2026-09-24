import { useState } from 'react';
import type { ChatMessageView } from '../../hooks/useSession.js';

interface EvilChatPanelProps {
  messages: ChatMessageView[];
  selfPlayerId?: string;
  onSend: (text: string) => void;
  readOnly?: boolean;
}

export function EvilChatPanel({ messages, selfPlayerId, onSend, readOnly }: EvilChatPanelProps) {
  const [text, setText] = useState('');

  return (
    <div className="panel" style={{ borderColor: 'var(--evil-red)' }}>
      <h3 style={{ marginTop: 0 }} className="alignment-evil">
        Evil Chat
      </h3>
      <div
        style={{
          maxHeight: 220,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          marginBottom: 12,
        }}
      >
        {messages.length === 0 && <p className="faint">No messages yet. Coordinate with your team.</p>}
        {messages.map((m, i) => (
          <div key={`${m.senderId}-${m.ts}-${i}`}>
            <strong className={m.senderId === selfPlayerId ? 'alignment-evil' : ''}>{m.senderName}: </strong>
            <span>{m.text}</span>
          </div>
        ))}
      </div>
      {!readOnly && (
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="input"
            style={{ flex: 1, minWidth: 0 }}
            value={text}
            placeholder="Message your fellow evil players…"
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && text.trim()) {
                onSend(text.trim());
                setText('');
              }
            }}
          />
          <button
            className="btn btn-inline btn-danger"
            disabled={!text.trim()}
            onClick={() => {
              onSend(text.trim());
              setText('');
            }}
          >
            Send
          </button>
        </div>
      )}
    </div>
  );
}
