import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createSession, joinSession } from '../api/rest.js';
import { savePlayerSession, saveStorytellerSession } from '../api/storage.js';
import { ApiError } from '../api/rest.js';

const SLOW_REQUEST_MS = 4000;

export function HomePage() {
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [slow, setSlow] = useState(false);
  const slowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function startBusy() {
    setBusy(true);
    setError(null);
    setSlow(false);
    slowTimerRef.current = setTimeout(() => setSlow(true), SLOW_REQUEST_MS);
  }

  function stopBusy() {
    setBusy(false);
    setSlow(false);
    if (slowTimerRef.current) {
      clearTimeout(slowTimerRef.current);
      slowTimerRef.current = null;
    }
  }

  useEffect(() => {
    return () => {
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
    };
  }, []);

  async function handleCreate() {
    startBusy();
    try {
      const { code, storytellerToken } = await createSession();
      saveStorytellerSession(code, storytellerToken);
      navigate(`/storyteller/${code}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create a game right now.');
    } finally {
      stopBusy();
    }
  }

  async function handleJoin() {
    if (!joinCode.trim() || !displayName.trim()) return;
    startBusy();
    try {
      const code = joinCode.trim().toUpperCase();
      const { playerId, playerToken } = await joinSession(code, displayName.trim());
      savePlayerSession(code, playerId, playerToken);
      navigate(`/play/${code}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not join that game.');
    } finally {
      stopBusy();
    }
  }

  return (
    <div className="app-shell">
      <header style={{ textAlign: 'center', marginBottom: 32 }}>
        <h1 style={{ fontSize: 40, margin: 0 }}>🕛 Blood on the Clocktower</h1>
        <p className="muted">A game of murder, mystery, and deduction in Ravenswood Bluff.</p>
      </header>

      <div className="panel">
        <h2 style={{ marginTop: 0 }}>Host a Game</h2>
        <p className="muted">Create a session and become the Storyteller.</p>
        <button className="btn btn-primary" disabled={busy} onClick={handleCreate}>
          {busy ? 'Creating…' : 'Create Game'}
        </button>
      </div>

      <div className="panel">
        <h2 style={{ marginTop: 0 }}>Join a Game</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 320 }}>
          <input
            className="input"
            placeholder="Join code (e.g. FX7K2)"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            maxLength={6}
          />
          <input
            className="input"
            placeholder="Your name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={30}
          />
          <button className="btn btn-primary" disabled={busy} onClick={handleJoin}>
            {busy ? 'Joining…' : 'Join Game'}
          </button>
        </div>
      </div>

      {busy && slow && (
        <p className="faint" role="status">
          Waking up the server — this can take up to a minute on the first request. Hang tight…
        </p>
      )}

      {error && (
        <p className="alignment-evil" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
