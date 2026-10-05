/**
 * Best-effort localStorage helpers.
 *
 * Browsers cap localStorage at a few MB per origin, and report photos travel
 * as base64 data URLs — so a busy reports list can exhaust the quota. An
 * uncaught `QuotaExceededError` inside a React effect unmounts the whole tree
 * (the "white screen after submitting a report" bug), so every write must be
 * non-fatal: on overflow the caller can supply a smaller `slim` candidate and
 * the failure is downgraded to a console warning.
 */

export interface SafeSetOptions<T> {
  /** Builds a smaller candidate payload when the full value does not fit. */
  slim?: (value: T) => T;
}

function tryWrite(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function safeSetItem<T>(key: string, value: T, options: SafeSetOptions<T> = {}): boolean {
  if (tryWrite(key, value)) return true;

  if (options.slim) {
    const slimmed = options.slim(value);
    if (slimmed !== value && tryWrite(key, slimmed)) {
      console.warn(`[storage] "${key}" exceeded the quota — cached a slimmed copy instead.`);
      return true;
    }
  }

  console.warn(`[storage] "${key}" exceeded the quota — keeping it in memory only.`);
  return false;
}

/** Parse a cached JSON value, falling back when absent or corrupted. */
export function safeGetJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed === undefined || parsed === null ? fallback : (parsed as T);
  } catch {
    return fallback;
  }
}
