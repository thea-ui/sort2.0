import { afterEach, describe, expect, it, vi } from 'vitest';
import { safeGetJSON, safeSetItem } from '../safeStorage';

function installFakeStorage(limitChars: number): Map<string, string> {
  const store = new Map<string, string>();
  const fake = {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      if (value.length > limitChars) {
        const error = new Error('quota exceeded');
        error.name = 'QuotaExceededError';
        throw error;
      }
      store.set(key, value);
    },
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
    key: () => null,
    length: 0,
  };
  vi.stubGlobal('localStorage', fake);
  return store;
}

describe('safeSetItem', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('writes the JSON payload when it fits', () => {
    const store = installFakeStorage(10_000);
    expect(safeSetItem('sort_reports', [{ id: 'a' }])).toBe(true);
    expect(store.get('sort_reports')).toBe('[{"id":"a"}]');
  });

  it('never throws when the quota is exceeded', () => {
    installFakeStorage(10);
    expect(() => safeSetItem('sort_reports', [{ id: 'a'.repeat(100) }])).not.toThrow();
    expect(safeSetItem('sort_reports', [{ id: 'a'.repeat(100) }])).toBe(false);
  });

  it('uses the slim candidate when the full payload does not fit', () => {
    const store = installFakeStorage(60);
    const reports = [{ id: 'a'.repeat(80), imageUrl: undefined }];
    const ok = safeSetItem('sort_reports', reports, {
      slim: (value) => value.map((report) => ({ ...report, id: 'slim' })),
    });
    expect(ok).toBe(true);
    expect(store.get('sort_reports')).toBe('[{"id":"slim"}]');
  });

  it('treats a stringify failure (circular data) as non-fatal', () => {
    installFakeStorage(10_000);
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(safeSetItem('sort_reports', circular)).toBe(false);
  });
});

describe('safeGetJSON', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('returns the parsed cached value', () => {
    const store = installFakeStorage(10_000);
    store.set('sort_reports', '[{"id":"cached"}]');
    expect(safeGetJSON('sort_reports', [])).toEqual([{ id: 'cached' }]);
  });

  it('falls back for missing or corrupted entries', () => {
    const store = installFakeStorage(10_000);
    expect(safeGetJSON('sort_reports', [])).toEqual([]);
    store.set('sort_reports', '{not json');
    expect(safeGetJSON('sort_reports', [])).toEqual([]);
    store.set('sort_reports', 'null');
    expect(safeGetJSON('sort_reports', [])).toEqual([]);
  });
});
