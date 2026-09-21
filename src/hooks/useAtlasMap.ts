import { useCallback, useEffect, useRef, useState } from 'react';
import { apiService, fetchAtlasCampusImageObjectUrl } from '../services/api';
import { AtlasBuilding, AtlasMapPayload } from '../types';

const REVALIDATE_MS = 5 * 60 * 1000;
const PAYLOAD_TTL_MS = 30 * 1000;

// Module-level cache: several maps can mount at once (bin map frames, report
// pickers) and must not trigger one ATLAS request each.
let payloadCache: { payload: AtlasMapPayload; at: number } | null = null;
let payloadInflight: Promise<AtlasMapPayload> | null = null;

async function loadAtlasPayload(force: boolean): Promise<AtlasMapPayload> {
  if (!force && payloadCache && Date.now() - payloadCache.at < PAYLOAD_TTL_MS) {
    return payloadCache.payload;
  }
  if (payloadInflight) return payloadInflight;

  payloadInflight = apiService
    .getAtlasMap()
    .then((payload) => {
      payloadCache = { payload, at: Date.now() };
      return payload;
    })
    .finally(() => {
      payloadInflight = null;
    });

  return payloadInflight;
}

/** Synchronous peek at the cached payload (lets maps skip the first paint delay). */
export function peekAtlasPayload(): AtlasMapPayload | null {
  if (!payloadCache) return null;
  if (Date.now() - payloadCache.at > PAYLOAD_TTL_MS) return null;
  return payloadCache.payload;
}

/**
 * Warm the cache right after sign-in so opening a map never shows a fallback
 * flash. Safe to call repeatedly; in-flight requests are coalesced.
 */
export function primeAtlasMapCache(): void {
  try {
    if (!sessionStorage.getItem('sortv2_token')) return;
    if (peekAtlasPayload()) return;
    void loadAtlasPayload(false).catch(() => {
      /* maps fall back gracefully on their own */
    });
  } catch {
    /* no-op */
  }
}

export interface UseAtlasMapResult {
  buildings: AtlasBuilding[];
  syncedAt: string | null;
  stale: boolean;
  campusImageUrl: string | null;
  hasSnapshot: boolean;
  loading: boolean;
  /** True once the first load attempt has settled (success or failure). */
  resolved: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Loads the SORT-side ATLAS mirror.
 * - Revalidates on window focus / visibility and every 5 minutes.
 * - The campus image is protected, so it is fetched as a blob object URL and
 *   revoked on cleanup/replacement.
 */
export function useAtlasMap(): UseAtlasMapResult {
  const cached = peekAtlasPayload();
  const [payload, setPayload] = useState<AtlasMapPayload | null>(cached);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(!cached);
  const [resolved, setResolved] = useState(Boolean(cached));
  const [error, setError] = useState<string | null>(null);

  const imageUrlRef = useRef<string | null>(null);
  const mountedRef = useRef(true);

  const replaceImage = useCallback((next: string | null) => {
    if (imageUrlRef.current && imageUrlRef.current !== next) {
      window.URL.revokeObjectURL(imageUrlRef.current);
    }
    imageUrlRef.current = next;
    if (mountedRef.current) setImageUrl(next);
  }, []);

  const load = useCallback(
    async (silent: boolean, force = false) => {
      if (!silent) {
        setLoading(true);
        setError(null);
      }
      try {
        const data = await loadAtlasPayload(force);
        if (!mountedRef.current) return;
        setPayload(data);
        setError(null);

        if (!data.campusImageUrl) {
          replaceImage(null);
        } else {
          try {
            const objectUrl = await fetchAtlasCampusImageObjectUrl();
            if (mountedRef.current) replaceImage(objectUrl);
          } catch {
            // Image is optional; never fail the whole map because of it.
          }
        }
      } catch (err: any) {
        if (!mountedRef.current) return;
        setError(err?.message || 'Failed to load the campus map');
      } finally {
        if (mountedRef.current) {
          setResolved(true);
          if (!silent) setLoading(false);
        }
      }
    },
    [replaceImage]
  );

  useEffect(() => {
    mountedRef.current = true;
    load(false);

    const onFocus = () => load(true, true);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') load(true, true);
    };
    const onAtlasUpdated = () => load(true, true);

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('atlas_map_updated', onAtlasUpdated);
    const interval = window.setInterval(() => load(true, true), REVALIDATE_MS);

    return () => {
      mountedRef.current = false;
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('atlas_map_updated', onAtlasUpdated);
      window.clearInterval(interval);
      if (imageUrlRef.current) {
        window.URL.revokeObjectURL(imageUrlRef.current);
        imageUrlRef.current = null;
      }
    };
  }, [load]);

  return {
    buildings: payload?.buildings ?? [],
    syncedAt: payload?.syncedAt ?? null,
    stale: payload?.stale ?? true,
    campusImageUrl: imageUrl,
    hasSnapshot: payload?.syncedAt !== null && payload !== null,
    loading,
    resolved,
    error,
    refresh: () => load(false, true),
  };
}
