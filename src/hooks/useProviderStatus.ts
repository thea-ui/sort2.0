import { useEffect, useState } from 'react';
import { apiService } from '../services/api';

export interface ProviderStatus {
  online: boolean;
  checkedAt: string | null;
}

const POLL_INTERVAL_MS = 60_000;

/**
 * Tracks whether the identity provider (EnrollPro) is reachable.
 *
 * Backed by SORT's own public, cached `/api/auth/provider-status`, so the login
 * screens can warn about an outage before anyone types credentials. Polls every
 * minute and keeps the last known value if SORT itself is unreachable (the
 * outage of interest is EnrollPro's, not SORT's).
 */
export function useProviderStatus(): { status: ProviderStatus | null; loading: boolean } {
  const [status, setStatus] = useState<ProviderStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await apiService.getProviderStatus();
        if (!cancelled) setStatus({ online: res.online, checkedAt: res.checkedAt });
      } catch {
        // SORT unreachable: keep the previous reading rather than flip to a
        // misleading "online" or "offline".
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    const id = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return { status, loading };
}
