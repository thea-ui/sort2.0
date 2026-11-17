import { useCallback, useSyncExternalStore } from 'react';

export const MOBILE_MEDIA_QUERY = '(max-width: 767px)';
export const TABLET_MEDIA_QUERY = '(min-width: 768px)';
export const DESKTOP_MEDIA_QUERY = '(min-width: 1024px)';

/**
 * Reactive `matchMedia` wrapper. Server/prerender snapshots resolve to `false`
 * so markup stays deterministic; the client re-reads on subscribe.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
        return () => {};
      }
      const mediaQueryList = window.matchMedia(query);
      mediaQueryList.addEventListener('change', onStoreChange);
      return () => mediaQueryList.removeEventListener('change', onStoreChange);
    },
    [query],
  );

  const getSnapshot = useCallback(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia(query).matches;
  }, [query]);

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

/** True below the `md` breakpoint (mobile card views). */
export const useIsMobile = () => useMediaQuery(MOBILE_MEDIA_QUERY);

/** True at `md` and up (table views). */
export const useIsTablet = () => useMediaQuery(TABLET_MEDIA_QUERY);

/** True at `lg` and up (persistent desktop shell). */
export const useIsDesktop = () => useMediaQuery(DESKTOP_MEDIA_QUERY);
