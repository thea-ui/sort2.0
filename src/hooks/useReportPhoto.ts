import { useEffect, useState } from 'react';
import { fetchReportPhotoObjectUrl } from '../services/api';

/**
 * Report photo loader. Server payloads carry `photoUrl` instead of multi-MB
 * base64 blobs; this module resolves such URLs to cached object URLs.
 * - data:/blob:/http(s) sources (locally captured / legacy cache) render directly.
 * - `/api/...` paths are fetched with auth and cached (bounded LRU, 60 entries).
 */

const MAX_CACHED_PHOTOS = 60;

const photoCache = new Map<string, string>();
const inflight = new Map<string, Promise<string | null>>();

/** True when the source can be used directly in an <img> without fetching. */
export function isDirectEvidenceSrc(src?: string | null): src is string {
  return (
    !!src &&
    (src.startsWith('data:') ||
      src.startsWith('blob:') ||
      src.startsWith('http://') ||
      src.startsWith('https://'))
  );
}

function evictOldest() {
  const oldestKey = photoCache.keys().next().value;
  if (oldestKey === undefined) return;
  const url = photoCache.get(oldestKey);
  photoCache.delete(oldestKey);
  if (url) window.URL.revokeObjectURL(url);
}

/** Resolve a server photo path to a cached object URL (dedupes concurrent calls). */
export function loadReportPhoto(photoUrl: string): Promise<string | null> {
  const cached = photoCache.get(photoUrl);
  if (cached) return Promise.resolve(cached);

  const pending = inflight.get(photoUrl);
  if (pending) return pending;

  const promise = fetchReportPhotoObjectUrl(photoUrl)
    .then((url) => {
      inflight.delete(photoUrl);
      if (url) {
        photoCache.set(photoUrl, url);
        if (photoCache.size > MAX_CACHED_PHOTOS) evictOldest();
      }
      return url;
    })
    .catch(() => {
      inflight.delete(photoUrl);
      return null;
    });

  inflight.set(photoUrl, promise);
  return promise;
}

/** React binding for `loadReportPhoto` plus direct-source passthrough. */
export function useReportPhoto(
  photoUrl?: string | null,
  imageUrl?: string | null,
): string | null {
  const direct = isDirectEvidenceSrc(imageUrl) ? imageUrl : null;
  const [resolved, setResolved] = useState<string | null>(() =>
    !direct && photoUrl ? photoCache.get(photoUrl) ?? null : null,
  );

  useEffect(() => {
    if (direct || !photoUrl) {
      setResolved(null);
      return;
    }
    const cached = photoCache.get(photoUrl);
    if (cached) {
      setResolved(cached);
      return;
    }
    let cancelled = false;
    void loadReportPhoto(photoUrl).then((url) => {
      if (!cancelled && url) setResolved(url);
    });
    return () => {
      cancelled = true;
    };
  }, [direct, photoUrl]);

  return direct ?? resolved;
}
