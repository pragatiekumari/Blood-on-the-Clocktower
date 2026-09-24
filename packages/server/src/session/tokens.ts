import jwt from 'jsonwebtoken';

const DEV_SECRET = 'dev-secret-not-for-shared-hosting';

function resolveSecret(): string {
  const configured = process.env.CLOCKTOWER_JWT_SECRET;
  if (configured) return configured;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'CLOCKTOWER_JWT_SECRET must be set in production (e.g. `openssl rand -hex 32`). Refusing to start with the dev default.'
    );
  }
  return DEV_SECRET;
}

// Resolved once at module load: tokens are only meaningful for the lifetime of
// a game session (in-memory store), so a process-lifetime secret is sufficient.
const SECRET = resolveSecret();

export interface StorytellerTokenPayload {
  role: 'storyteller';
  sessionCode: string;
}

export interface PlayerTokenPayload {
  role: 'player';
  sessionCode: string;
  playerId: string;
}

export type TokenPayload = StorytellerTokenPayload | PlayerTokenPayload;

export function signStorytellerToken(sessionCode: string): string {
  const payload: StorytellerTokenPayload = { role: 'storyteller', sessionCode };
  return jwt.sign(payload, SECRET, { expiresIn: '24h' });
}

export function signPlayerToken(sessionCode: string, playerId: string): string {
  const payload: PlayerTokenPayload = { role: 'player', sessionCode, playerId };
  return jwt.sign(payload, SECRET, { expiresIn: '24h' });
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, SECRET) as TokenPayload;
}
