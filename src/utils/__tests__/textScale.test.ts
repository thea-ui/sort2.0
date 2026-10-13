import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_TEXT_SCALE_PERCENT,
  TEXT_SCALE_STEPS,
  TEXT_SCALE_STORAGE_PREFIX,
  normalizeTextScalePercent,
  readStoredTextScaleForUser,
  textScaleKeyForUser,
} from '../../hooks/useTextScale';

describe('normalizeTextScalePercent', () => {
  it('accepts every allowed step as a number or string', () => {
    for (const step of TEXT_SCALE_STEPS) {
      expect(normalizeTextScalePercent(step)).toBe(step);
      expect(normalizeTextScalePercent(String(step))).toBe(step);
    }
  });

  it('falls back to 100 for missing, corrupt, or unlisted values', () => {
    expect(normalizeTextScalePercent(null)).toBe(DEFAULT_TEXT_SCALE_PERCENT);
    expect(normalizeTextScalePercent(undefined)).toBe(DEFAULT_TEXT_SCALE_PERCENT);
    expect(normalizeTextScalePercent('')).toBe(DEFAULT_TEXT_SCALE_PERCENT);
    expect(normalizeTextScalePercent('abc')).toBe(DEFAULT_TEXT_SCALE_PERCENT);
    expect(normalizeTextScalePercent(95)).toBe(DEFAULT_TEXT_SCALE_PERCENT);
    expect(normalizeTextScalePercent(200)).toBe(DEFAULT_TEXT_SCALE_PERCENT);
    expect(normalizeTextScalePercent({ percent: 130 })).toBe(DEFAULT_TEXT_SCALE_PERCENT);
    expect(normalizeTextScalePercent(NaN)).toBe(DEFAULT_TEXT_SCALE_PERCENT);
  });

  it('pins the step list and default to the handoff contract', () => {
    expect([...TEXT_SCALE_STEPS]).toEqual([90, 100, 110, 120, 130, 140, 150]);
    expect(DEFAULT_TEXT_SCALE_PERCENT).toBe(100);
  });
});

describe('per-user text scale storage', () => {
  const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');

  function installFakeStorage(initial: Record<string, string> = {}) {
    const store = new Map(Object.entries(initial));
    const fake = {
      getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
      setItem: (key: string, value: string) => {
        store.set(key, String(value));
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    };
    Object.defineProperty(globalThis, 'localStorage', { value: fake, configurable: true });
    return store;
  }

  beforeEach(() => {
    installFakeStorage();
  });

  afterEach(() => {
    if (originalDescriptor) {
      Object.defineProperty(globalThis, 'localStorage', originalDescriptor);
    } else {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    }
  });

  it('scopes the storage key to the user id', () => {
    expect(textScaleKeyForUser('user-a')).toBe(`${TEXT_SCALE_STORAGE_PREFIX}:user-a`);
    expect(textScaleKeyForUser('user-a')).not.toBe(textScaleKeyForUser('user-b'));
  });

  it('reads each user only their own value', () => {
    installFakeStorage({
      [textScaleKeyForUser('user-a')]: '110',
      [textScaleKeyForUser('user-b')]: '140',
    });
    expect(readStoredTextScaleForUser('user-a')).toBe(110);
    expect(readStoredTextScaleForUser('user-b')).toBe(140);
    expect(readStoredTextScaleForUser('user-c')).toBe(DEFAULT_TEXT_SCALE_PERCENT);
  });

  it('migrates the legacy browser-wide key once, then deletes it', () => {
    const store = installFakeStorage({ [TEXT_SCALE_STORAGE_PREFIX]: '120' });

    expect(readStoredTextScaleForUser('user-a')).toBe(120);
    expect(store.get(textScaleKeyForUser('user-a'))).toBe('120');
    expect(store.has(TEXT_SCALE_STORAGE_PREFIX)).toBe(false);

    // The migrated value belongs to user-a only; user-b starts fresh.
    expect(readStoredTextScaleForUser('user-b')).toBe(DEFAULT_TEXT_SCALE_PERCENT);
  });

  it('prefers the scoped key over the legacy key and never overwrites it', () => {
    const store = installFakeStorage({
      [textScaleKeyForUser('user-a')]: '90',
      [TEXT_SCALE_STORAGE_PREFIX]: '150',
    });
    expect(readStoredTextScaleForUser('user-a')).toBe(90);
    // Scoped key found — the legacy key is left for the next fresh user.
    expect(store.get(TEXT_SCALE_STORAGE_PREFIX)).toBe('150');
  });

  it('treats a corrupt scoped value as 100 without touching the legacy key', () => {
    const store = installFakeStorage({
      [textScaleKeyForUser('user-a')]: 'abc',
      [TEXT_SCALE_STORAGE_PREFIX]: '120',
    });
    expect(readStoredTextScaleForUser('user-a')).toBe(DEFAULT_TEXT_SCALE_PERCENT);
    expect(store.get(TEXT_SCALE_STORAGE_PREFIX)).toBe('120');
  });

  it('degrades to 100 when storage is unavailable', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      get() {
        throw new Error('storage disabled');
      },
      configurable: true,
    });
    expect(readStoredTextScaleForUser('user-a')).toBe(DEFAULT_TEXT_SCALE_PERCENT);
  });
});
