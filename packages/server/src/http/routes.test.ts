import { describe, expect, it } from 'vitest';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createApp } from './app.js';
import { SessionStore } from '../session/store.js';
import { MAX_PLAYERS } from '@clocktower/shared';

async function withServer<T>(fn: (baseUrl: string) => Promise<T>): Promise<T> {
  const store = new SessionStore();
  const app = createApp(store);
  const httpServer = createServer(app);
  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  const address = httpServer.address() as AddressInfo;
  try {
    return await fn(`http://localhost:${address.port}`);
  } finally {
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  }
}

interface ErrorBody {
  error: { code: string; message: string };
}

interface CreateSessionBody {
  code: string;
  storytellerToken: string;
}

describe('REST error shape', () => {
  it('returns 404 with a named code for an unknown join code', async () => {
    await withServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/sessions/ZZZZZ`);
      expect(res.status).toBe(404);
      const body = (await res.json()) as ErrorBody;
      expect(body.error.code).toBe('INVALID_JOIN_CODE');
      expect(typeof body.error.message).toBe('string');
    });
  });

  it('returns 409 with a named code for a duplicate display name', async () => {
    await withServer(async (baseUrl) => {
      const createRes = await fetch(`${baseUrl}/api/sessions`, { method: 'POST' });
      const { code } = (await createRes.json()) as CreateSessionBody;
      await fetch(`${baseUrl}/api/sessions/${code}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: 'Alice' }),
      });
      const dupRes = await fetch(`${baseUrl}/api/sessions/${code}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: 'alice' }),
      });
      expect(dupRes.status).toBe(409);
      const body = (await dupRes.json()) as ErrorBody;
      expect(body.error.code).toBe('NAME_TAKEN');
    });
  });

  it('returns 422 for an invalid display name payload', async () => {
    await withServer(async (baseUrl) => {
      const createRes = await fetch(`${baseUrl}/api/sessions`, { method: 'POST' });
      const { code } = (await createRes.json()) as CreateSessionBody;
      const res = await fetch(`${baseUrl}/api/sessions/${code}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: '' }),
      });
      expect(res.status).toBe(422);
      const body = (await res.json()) as ErrorBody;
      expect(body.error.code).toBe('VALIDATION_FAILED');
    });
  });

  it('returns 403 once the lobby is full', async () => {
    await withServer(async (baseUrl) => {
      const createRes = await fetch(`${baseUrl}/api/sessions`, { method: 'POST' });
      const { code } = (await createRes.json()) as CreateSessionBody;
      for (let i = 0; i < MAX_PLAYERS; i++) {
        const r = await fetch(`${baseUrl}/api/sessions/${code}/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ displayName: `P${i}` }),
        });
        expect(r.status).toBe(201);
      }
      const overflowRes = await fetch(`${baseUrl}/api/sessions/${code}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: 'OneTooMany' }),
      });
      expect(overflowRes.status).toBe(403);
      const body = (await overflowRes.json()) as ErrorBody;
      expect(body.error.code).toBe('SESSION_FULL');
    });
  });
});
