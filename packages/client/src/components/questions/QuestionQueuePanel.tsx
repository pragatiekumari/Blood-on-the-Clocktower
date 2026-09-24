import { useState } from 'react';
import type { QuestionEntryView } from '@clocktower/shared';

interface QuestionQueuePanelProps {
  questions: QuestionEntryView[];
  selfPlayerId: string;
  onAsk: (text: string) => void;
  canAsk: boolean;
}

/**
 * Player-facing view of the post-night question queue: submit a question and
 * see the full queue (who's asked what, and answers so far). Evil players'
 * questions are already ordered first by the server — this just renders
 * whatever order the server sends.
 */
export function QuestionQueuePanel({ questions, selfPlayerId, onAsk, canAsk }: QuestionQueuePanelProps) {
  const [text, setText] = useState('');
  const activeIndex = questions.findIndex((q) => !q.answered);

  function submit() {
    if (!text.trim()) return;
    onAsk(text.trim());
    setText('');
  }

  return (
    <div className="panel">
      <h3 style={{ marginTop: 0 }}>Ask the Storyteller</h3>
      {!canAsk && <p className="faint">Questions can be asked during the day, after night ends.</p>}
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          className="input"
          style={{ flex: 1, minWidth: 0 }}
          placeholder="Type your question…"
          value={text}
          disabled={!canAsk}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
          }}
        />
        <button className="btn btn-inline btn-primary" disabled={!canAsk || !text.trim()} onClick={submit}>
          Ask
        </button>
      </div>

      {questions.length > 0 && (
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {questions.map((q, i) => (
            <div
              key={q.questionId}
              className="panel"
              style={{
                padding: 12,
                borderColor: i === activeIndex ? 'var(--accent-gold)' : undefined,
                opacity: q.answered || i === activeIndex ? 1 : 0.55,
              }}
            >
              <p style={{ margin: 0 }}>
                <strong>
                  {q.playerName}
                  {q.playerId === selfPlayerId && ' (you)'}:
                </strong>{' '}
                {q.text}
              </p>
              {q.answered ? (
                <p className="muted" style={{ margin: '6px 0 0' }}>
                  <strong>Storyteller:</strong> {q.answer}
                </p>
              ) : i === activeIndex ? (
                <p className="faint" style={{ margin: '6px 0 0' }}>
                  Waiting for the Storyteller to answer…
                </p>
              ) : (
                <p className="faint" style={{ margin: '6px 0 0' }}>
                  Queued
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
