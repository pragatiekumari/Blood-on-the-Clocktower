import { useState } from 'react';
import type { QuestionEntryView } from '@clocktower/shared';

interface StorytellerQuestionPanelProps {
  questions: QuestionEntryView[];
  onAnswer: (questionId: string, answer: string) => void;
}

/** Storyteller view of the question queue: answer the active (front-most unanswered) question, one at a time. */
export function StorytellerQuestionPanel({ questions, onAnswer }: StorytellerQuestionPanelProps) {
  const [answerText, setAnswerText] = useState('');
  const active = questions.find((q) => !q.answered) ?? null;
  const answered = questions.filter((q) => q.answered);

  function submit() {
    if (!active || !answerText.trim()) return;
    onAnswer(active.questionId, answerText.trim());
    setAnswerText('');
  }

  return (
    <div className="panel">
      <h2 style={{ marginTop: 0 }}>Question Queue</h2>
      {questions.length === 0 && <p className="faint">No questions yet.</p>}

      {active && (
        <div className="panel" style={{ borderColor: 'var(--accent-gold)' }}>
          <p style={{ margin: 0 }}>
            <strong>{active.playerName}</strong> asks:
          </p>
          <p style={{ margin: '4px 0 12px' }}>{active.text}</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="input"
              style={{ flex: 1, minWidth: 0 }}
              placeholder="Your answer…"
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit();
              }}
            />
            <button className="btn btn-inline btn-primary" disabled={!answerText.trim()} onClick={submit}>
              Answer
            </button>
          </div>
        </div>
      )}

      {answered.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <p className="faint" style={{ textTransform: 'uppercase', fontSize: 12, letterSpacing: '0.06em' }}>
            Answered
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {answered.map((q) => (
              <div key={q.questionId} style={{ opacity: 0.75 }}>
                <p style={{ margin: 0 }}>
                  <strong>{q.playerName}:</strong> {q.text}
                </p>
                <p className="muted" style={{ margin: '2px 0 0' }}>
                  → {q.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
