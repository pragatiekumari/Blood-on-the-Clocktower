import { beforeEach, describe, expect, it } from 'vitest';
import { clearStoredSession, getStoredSession, hasSeenOnboarding, markOnboardingSeen, savePlayerSession, saveStorytellerSession } from './storage.js';

describe('session storage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('stores and retrieves a storyteller session', () => {
    saveStorytellerSession('ABCDE', 'tok123');
    const stored = getStoredSession();
    expect(stored.code).toBe('ABCDE');
    expect(stored.storytellerToken).toBe('tok123');
    expect(stored.playerToken).toBeNull();
  });

  it('stores and retrieves a player session, clearing any prior storyteller token', () => {
    saveStorytellerSession('ABCDE', 'tok123');
    savePlayerSession('ABCDE', 'p1', 'ptok');
    const stored = getStoredSession();
    expect(stored.playerToken).toBe('ptok');
    expect(stored.storytellerToken).toBeNull();
  });

  it('clears all session data', () => {
    savePlayerSession('ABCDE', 'p1', 'ptok');
    clearStoredSession();
    const stored = getStoredSession();
    expect(stored.code).toBeNull();
    expect(stored.playerToken).toBeNull();
  });

  it('tracks onboarding-seen flag independent of session data', () => {
    expect(hasSeenOnboarding()).toBe(false);
    markOnboardingSeen();
    expect(hasSeenOnboarding()).toBe(true);
  });
});
