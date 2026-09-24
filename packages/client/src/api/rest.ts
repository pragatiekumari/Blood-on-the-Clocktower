import { SERVER_URL } from './config.js';

export interface ApiErrorBody {
  error: { code: string; message: string };
}

export class ApiError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${SERVER_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
    if (body?.error) {
      throw new ApiError(body.error.code, body.error.message);
    }
    throw new ApiError('UNKNOWN_ERROR', 'Something went wrong. Please try again.');
  }
  return res.json() as Promise<T>;
}

export function createSession() {
  return request<{ code: string; storytellerToken: string }>('/api/sessions', { method: 'POST' });
}

export function getSessionInfo(code: string) {
  return request<{ code: string; phase: string; playerCount: number; maxPlayers: number }>(
    `/api/sessions/${encodeURIComponent(code)}`
  );
}

export function joinSession(code: string, displayName: string) {
  return request<{ playerId: string; playerToken: string; code: string }>(
    `/api/sessions/${encodeURIComponent(code)}/join`,
    {
      method: 'POST',
      body: JSON.stringify({ displayName }),
    }
  );
}
