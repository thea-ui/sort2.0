import { useCallback, useEffect, useState } from 'react';

export type AppRoute = 'landing' | 'admin-login' | 'mrf-login' | 'report-print';

const ROUTE_PATHS: Record<AppRoute, string> = {
  landing: '/',
  'admin-login': '/admin',
  'mrf-login': '/mrf',
  'report-print': '/reports/print',
};

export function normalizePath(pathname: string): string {
  return pathname.toLowerCase().replace(/\/+$/, '') || '/';
}

export function routeFromPath(pathname: string): AppRoute {
  const normalized = normalizePath(pathname);
  if (normalized === '/admin') return 'admin-login';
  if (normalized === '/mrf') return 'mrf-login';
  if (normalized === '/reports/print') return 'report-print';
  return 'landing';
}

/**
 * Path-based routing for the portal entry points: `/admin` and `/mrf` are
 * shareable, refresh-safe URLs; everything else falls back to the landing page.
 */
export function usePathRoute(): { route: AppRoute; navigate: (route: string) => void } {
  const [route, setRoute] = useState<AppRoute>(() => routeFromPath(window.location.pathname));

  useEffect(() => {
    const handlePopState = () => setRoute(routeFromPath(window.location.pathname));
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = useCallback((next: string) => {
    // 'dashboard' is resolved by the auth gate, never by the URL, so a portal
    // sign-in keeps the /admin or /mrf path it started from.
    if (next === 'dashboard') return;
    const target = ROUTE_PATHS[next as AppRoute] ?? ROUTE_PATHS.landing;
    if (normalizePath(window.location.pathname) !== target) {
      window.history.pushState({}, '', target);
    }
    setRoute(routeFromPath(target));
  }, []);

  return { route, navigate };
}
