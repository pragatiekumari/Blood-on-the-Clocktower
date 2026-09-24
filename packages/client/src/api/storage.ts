const STORYTELLER_TOKEN_KEY = 'botc:storytellerToken';
const PLAYER_TOKEN_KEY = 'botc:playerToken';
const PLAYER_ID_KEY = 'botc:playerId';
const SESSION_CODE_KEY = 'botc:sessionCode';
const ONBOARDING_SEEN_KEY = 'botc:onboarding:seen';

// Referenced via `window.localStorage` rather than the bare global: in the
// browser these are the same object, but in the Vitest/jsdom test environment
// under Node's newer built-in `localStorage` global this avoids ambiguity
// between Node's native implementation and jsdom's per-window implementation.
function storage(): Storage {
  return window.localStorage;
}

export function saveStorytellerSession(code: string, token: string): void {
  storage().setItem(SESSION_CODE_KEY, code);
  storage().setItem(STORYTELLER_TOKEN_KEY, token);
  storage().removeItem(PLAYER_TOKEN_KEY);
  storage().removeItem(PLAYER_ID_KEY);
}

export function savePlayerSession(code: string, playerId: string, token: string): void {
  storage().setItem(SESSION_CODE_KEY, code);
  storage().setItem(PLAYER_TOKEN_KEY, token);
  storage().setItem(PLAYER_ID_KEY, playerId);
  storage().removeItem(STORYTELLER_TOKEN_KEY);
}

export function getStoredSession(): { code: string | null; storytellerToken: string | null; playerToken: string | null } {
  return {
    code: storage().getItem(SESSION_CODE_KEY),
    storytellerToken: storage().getItem(STORYTELLER_TOKEN_KEY),
    playerToken: storage().getItem(PLAYER_TOKEN_KEY),
  };
}

export function clearStoredSession(): void {
  storage().removeItem(SESSION_CODE_KEY);
  storage().removeItem(STORYTELLER_TOKEN_KEY);
  storage().removeItem(PLAYER_TOKEN_KEY);
  storage().removeItem(PLAYER_ID_KEY);
}

export function hasSeenOnboarding(): boolean {
  return storage().getItem(ONBOARDING_SEEN_KEY) === 'true';
}

export function markOnboardingSeen(): void {
  storage().setItem(ONBOARDING_SEEN_KEY, 'true');
}
