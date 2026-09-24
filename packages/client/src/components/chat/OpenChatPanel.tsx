import { useState } from 'react';
import type { ChatMessageView } from '../../hooks/useSession.js';

interface OpenChatPanelProps {
  messages: ChatMessageView[];
  selfPlayerId?: string;
  onSend: (text: string) => void;
}

/** Everyone-can-talk discussion channel: every connected player plus the Storyteller. */
export function OpenChatPanel({ messages, selfPlayerId, onSend }: OpenChatPanelProps) {
  const [text, setText] = useState('');

  return (
    <div className="panel">
      <h3 style={{ marginTop: 0 }}>Open Discussion</h3>
      <p className="faint" style={{ marginTop: -8, marginBottom: 12 }}>
        Visible to everyone at the table, including the Storyteller.
      </p>
      <div
        style={{
          maxHeight: 320,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          marginBottom: 12,
        }}
      >
        {messages.length === 0 && <p className="faint">No messages yet. Say hello to the table.</p>}
        {messages.map((m, i) => (
          <div key={`${m.senderId}-${m.ts}-${i}`}>
            <strong className={m.senderId === selfPlayerId ? 'alignment-good' : ''}>{m.senderName}: </strong>
            <span>{m.text}</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          className="input"
          style={{ flex: 1, minWidth: 0 }}
          value={text}
          placeholder="Message everyone at the table…"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && text.trim()) {
              onSend(text.trim());
              setText('');
            }
          }}
        />
        <button
          className="btn btn-inline btn-primary"
          disabled={!text.trim()}
          onClick={() => {
            onSend(text.trim());
            setText('');
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
