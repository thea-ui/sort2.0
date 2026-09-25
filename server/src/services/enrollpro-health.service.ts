/**
 * Cached EnrollPro reachability probe for public UI surfaces.
 *
 * The admin `/api/sync/health` endpoint reports integration-key details, so it
 * cannot be exposed to the login screens. This service answers the single
 * question the UI needs — "is the identity provider reachable?" — with a short
 * timeout and a small cache so a public page cannot be used to hammer EnrollPro
 * or to amplify a probe. It returns only a boolean and a timestamp: no keys, no
 * URLs, no user data.
 */
const DEFAULT_ENROLLPRO_BASE = 'https://dev-jegs.buru-degree.ts.net/api';
const CACHE_TTL_MS = 30_000;
const PROBE_TIMEOUT_MS = 3_000;

export interface ProviderStatus {
  provider: 'enrollpro';
  online: boolean;
  checkedAt: string;
  cached: boolean;
}

let cache: { online: boolean; checkedAt: number } | null = null;
let inFlight: Promise<boolean> | null = null;

async function probe(): Promise<boolean> {
  const base = process.env.ENROLLPRO_BASE_URL || DEFAULT_ENROLLPRO_BASE;
  try {
    const res = await fetch(`${base}/integration/v1/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function getProviderStatus(): Promise<ProviderStatus> {
  const now = Date.now();
  if (cache && now - cache.checkedAt < CACHE_TTL_MS) {
    return {
      provider: 'enrollpro',
      online: cache.online,
      checkedAt: new Date(cache.checkedAt).toISOString(),
      cached: true,
    };
  }

  if (!inFlight) {
    inFlight = probe().finally(() => {
      inFlight = null;
    });
  }
  const online = await inFlight;

  cache = { online, checkedAt: Date.now() };
  return {
    provider: 'enrollpro',
    online,
    checkedAt: new Date(cache.checkedAt).toISOString(),
    cached: false,
  };
}
