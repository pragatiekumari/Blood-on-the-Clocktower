import { useEffect, useState } from 'react';
import type { ErrorPayload } from '@clocktower/shared';

interface ErrorToastProps {
  error: ErrorPayload | null;
}

/** Displays the most recent error for a few seconds, then auto-dismisses. */
export function ErrorToast({ error }: ErrorToastProps) {
  const [visible, setVisible] = useState(false);
  const [current, setCurrent] = useState<ErrorPayload | null>(null);

  useEffect(() => {
    if (!error) return;
    setCurrent(error);
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 5000);
    return () => clearTimeout(timer);
  }, [error]);

  if (!visible || !current) return null;

  return (
    <div className="error-toast" role="alert">
      {current.message}
    </div>
  );
}
