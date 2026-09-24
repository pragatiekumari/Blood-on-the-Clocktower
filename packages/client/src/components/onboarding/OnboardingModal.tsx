import { useState } from 'react';
import { CORE_RULES, DAY_NIGHT_SUMMARY, GOAL_STEP_GENERIC, THEME_STEP } from '@clocktower/shared';
import type { Alignment } from '@clocktower/shared';

interface OnboardingModalProps {
  onClose: () => void;
  alignment?: Alignment | null;
}

type Step = 'theme' | 'goal' | 'rules';
const STEPS: Step[] = ['theme', 'goal', 'rules'];

export function OnboardingModal({ onClose, alignment }: OnboardingModalProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const step = STEPS[stepIndex];

  const isLast = stepIndex === STEPS.length - 1;
  const isFirst = stepIndex === 0;

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
      <div className="panel modal-panel" style={{ maxWidth: 520 }}>
        <div className="step-indicator" style={{ marginBottom: 20 }}>
          {STEPS.map((s, i) => (
            <span
              key={s}
              className={i === stepIndex ? 'active' : ''}
              style={{ textTransform: 'capitalize', padding: '4px 0' }}
            >
              {s}
            </span>
          ))}
        </div>

        {step === 'theme' && (
          <div>
            <h2>{THEME_STEP.title}</h2>
            <p style={{ lineHeight: 1.6 }}>{THEME_STEP.body}</p>
          </div>
        )}

        {step === 'goal' && (
          <div>
            <h2>Your Goal</h2>
            {alignment ? (
              <p style={{ lineHeight: 1.6 }} className={alignment === 'evil' ? 'alignment-evil' : 'alignment-good'}>
                {GOAL_STEP_GENERIC[alignment]}
              </p>
            ) : (
              <>
                <p style={{ lineHeight: 1.6 }} className="alignment-good">
                  {GOAL_STEP_GENERIC.good}
                </p>
                <p style={{ lineHeight: 1.6 }} className="alignment-evil">
                  {GOAL_STEP_GENERIC.evil}
                </p>
              </>
            )}
          </div>
        )}

        {step === 'rules' && (
          <div>
            <h2>The Rules</h2>
            <ul style={{ lineHeight: 1.7, paddingLeft: 20 }}>
              {CORE_RULES.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
            <p className="muted" style={{ marginTop: 12 }}>
              {DAY_NIGHT_SUMMARY}
            </p>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, gap: 12 }}>
          <button
            className="btn btn-inline"
            disabled={isFirst}
            onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
          >
            Back
          </button>
          {isLast ? (
            <button className="btn btn-inline btn-primary" onClick={onClose}>
              Let's Play
            </button>
          ) : (
            <button
              className="btn btn-inline btn-primary"
              onClick={() => setStepIndex((i) => Math.min(STEPS.length - 1, i + 1))}
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
