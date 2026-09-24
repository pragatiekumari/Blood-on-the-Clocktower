import { useState } from 'react';
import type { QuestionEntryView } from '@clocktower/shared';

interface QuestionQueuePanelProps {
  questions: QuestionEntryView[];
  onAsk: (text: string) => void;
  canAsk: boolean;
}

/**
 * Player-facing view of the post-night question flow. Questions are
 * private: this player only ever receives their OWN questions and answers
 * from the server, never anyone else's — the Storyteller answers privately,
 * and it's up to the player to repeat it aloud during discussion if they
 * choose to. There is no visibility into other players' queue position,
 * since that would leak who else has asked something.
 */
export function QuestionQueuePanel({ questions, onAsk, canAsk }: QuestionQueuePanelProps) {
  const [text, setText] = useState('');

  function submit() {
    if (!text.trim()) return;
    onAsk(text.trim());
    setText('');
  }

  return (
    <div className="panel">
      <h3 style={{ marginTop: 0 }}>Ask the Storyteller</h3>
      <p className="faint" style={{ marginTop: -4 }}>
        This is private between you and the Storyteller. Share it with the group yourself if you want to.
      </p>
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
          {questions.map((q) => (
            <div
              key={q.questionId}
              className="panel"
              style={{
                padding: 12,
                borderColor: !q.answered ? 'var(--accent-gold)' : undefined,
              }}
            >
              <p style={{ margin: 0 }}>
                <strong>You asked:</strong> {q.text}
              </p>
              {q.answered ? (
                <p className="muted" style={{ margin: '6px 0 0' }}>
                  <strong>Storyteller:</strong> {q.answer}
                </p>
              ) : (
                <p className="faint" style={{ margin: '6px 0 0' }}>
                  Waiting for the Storyteller to answer…
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
