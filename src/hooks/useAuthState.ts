import { useState, useEffect, useCallback } from 'react';
import { User, Role } from '../types';
import {
  apiService,
  storeRefreshToken,
  clearRefreshToken,
  storeUserSnapshot,
  clearUserSnapshot,
  getUserSnapshot,
  getPersistedUserId,
} from '../services/api';

export type LoginResult = { ok: true; user: User } | { ok: false; code: string; message: string };

/**
 * `degraded` means SORT could not be reached to revalidate the session, but we
 * deliberately kept the user signed in on the strength of the cached profile
 * and the still-valid refresh token. Any definitive rejection signs the user
 * out instead — degraded must never become a soft auth bypass.
 */
export type SessionHealth = 'ok' | 'degraded';

const REFRESH_INTERVAL_MS = 12 * 60 * 1000;
const DEGRADED_RETRY_MS = 60 * 1000;

function toUser(raw: any): User {
  return {
    ...raw,
    certificatesEarned: raw.certificatesEarned || raw.certificates || [],
  };
}

export function useAuthState() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('sort_auth') === 'true';
  });
  const [sessionHealth, setSessionHealth] = useState<SessionHealth>('ok');

  const applyUser = useCallback((raw: any) => {
    const u = toUser(raw);
    setCurrentUser(u);
    setIsAuthenticated(true);
    sessionStorage.setItem('sort_auth', 'true');
    storeUserSnapshot(u);
    setSessionHealth('ok');
  }, []);

  const logout = useCallback(() => {
    const userId = sessionStorage.getItem('sortv2_user_id') || getPersistedUserId();
    const refreshToken = userId ? localStorage.getItem(`sortv2_refresh_${userId}`) : null;
    if (refreshToken) {
      apiService.logout(refreshToken).catch(() => {});
    }
    if (userId) clearRefreshToken(userId);
    sessionStorage.removeItem('sortv2_token');
    sessionStorage.removeItem('sortv2_user_id');
    sessionStorage.setItem('sort_auth', 'false');
    clearUserSnapshot();
    setCurrentUser(null);
    setIsAuthenticated(false);
    setSessionHealth('ok');
  }, []);

  // Boot: restore the session from whatever evidence survives. A browser
  // restart clears sessionStorage but keeps the 7-day refresh token, so the
  // user must not be forced back to a login screen — especially while the
  // identity provider is unreachable.
  useEffect(() => {
    let cancelled = false;

    const keepCachedSession = (): void => {
      const snapshot = getUserSnapshot();
      if (snapshot) {
        setCurrentUser(snapshot);
        setIsAuthenticated(true);
        setSessionHealth('degraded');
      } else {
        setIsAuthenticated(false);
        sessionStorage.setItem('sort_auth', 'false');
      }
    };

    const resumeFromRefresh = async (): Promise<void> => {
      const res = await apiService.restoreSession().catch(() => ({ status: 'unreachable' as const }));
      if (cancelled) return;
      if (res.status === 'restored') {
        applyUser(res.user);
        return;
      }
      // `unreachable` means SORT itself is down but the stored credential may
      // still be good, so a cached profile keeps the session alive (degraded).
      // `none` means there is no valid credential, so never fall back to cache.
      if (res.status === 'unreachable') {
        keepCachedSession();
        return;
      }
      setIsAuthenticated(false);
      sessionStorage.setItem('sort_auth', 'false');
    };

    const token = sessionStorage.getItem('sortv2_token');
    if (!token) {
      void resumeFromRefresh();
      return;
    }

    apiService
      .getCurrentUser()
      .then((res) => {
        if (cancelled) return;
        if (res?.user) {
          applyUser(res.user);
        } else {
          void resumeFromRefresh();
        }
      })
      .catch((err) => {
        if (cancelled) return;
        const status = (err as { status?: number })?.status;
        if (status === 401 || status === 403 || status === 404) {
          void resumeFromRefresh();
          return;
        }
        keepCachedSession();
      });

    return () => {
      cancelled = true;
    };
  }, [applyUser]);

  // Silent token refresh. A transient failure keeps the session and retries;
  // only a definitive rejection signs the user out.
  useEffect(() => {
    if (!isAuthenticated) return;
    if (sessionHealth === 'degraded') return;
    const intervalId = setInterval(async () => {
      const outcome = await apiService.refreshAccessToken();
      if (outcome.status === 'refreshed') return;
      if (outcome.status === 'invalid') {
        logout();
        return;
      }
      setSessionHealth('degraded');
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [isAuthenticated, sessionHealth, logout]);

  // While degraded, poll faster so the session heals as soon as SORT is back.
  useEffect(() => {
    if (!isAuthenticated || sessionHealth !== 'degraded') return;
    const intervalId = setInterval(async () => {
      const outcome = await apiService.refreshAccessToken();
      if (outcome.status === 'refreshed') {
        setSessionHealth('ok');
      } else if (outcome.status === 'invalid') {
        logout();
      }
    }, DEGRADED_RETRY_MS);
    return () => clearInterval(intervalId);
  }, [isAuthenticated, sessionHealth, logout]);

  const login = async (password: string, identifier: string): Promise<LoginResult> => {
    try {
      const res = await apiService.login(identifier, password);
      if (res && res.token && res.user) {
        sessionStorage.setItem('sortv2_token', res.token);
        sessionStorage.setItem('sortv2_user_id', res.user.id);
        if (res.refreshToken) {
          storeRefreshToken(res.user.id, res.refreshToken);
        }
        const loggedUser: User = {
          ...res.user,
          certificatesEarned: res.user.certificatesEarned || (res.user as any).certificates || [],
        };
        setCurrentUser(loggedUser);
        setIsAuthenticated(true);
        sessionStorage.setItem('sort_auth', 'true');
        storeUserSnapshot(loggedUser);
        setSessionHealth('ok');
        return { ok: true, user: loggedUser };
      }
    } catch (err: any) {
      console.warn('Backend API authentication notice:', err);
      if (err.code) {
        return { ok: false, code: err.code, message: err.message };
      }
    }
    return { ok: false, code: 'SERVER_UNREACHABLE', message: 'Cannot reach the SORT server. Please try again later.' };
  };

  const changeRole = (newRole: Role, users: User[]) => {
    sessionStorage.setItem('sort_tab_role', newRole);
    const targetUser = users.find(u => u.role === newRole) || (currentUser ? { ...currentUser, role: newRole } : null);
    if (targetUser) {
      setCurrentUser(targetUser);
    }
  };

  return {
    currentUser,
    setCurrentUser,
    isAuthenticated,
    setIsAuthenticated,
    sessionHealth,
    login,
    logout,
    changeRole,
  };
}
