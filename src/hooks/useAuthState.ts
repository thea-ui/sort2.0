import { useState, useEffect, useRef } from 'react';
import { User, Role } from '../types';
import { apiService, storeRefreshToken, clearRefreshToken } from '../services/api';

export type LoginResult = { ok: true; user: User } | { ok: false; code: string; message: string };

const REFRESH_INTERVAL_MS = 12 * 60 * 1000;

export function useAuthState() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('sort_auth') === 'true';
  });

  // Restore user from server on mount if token exists
  useEffect(() => {
    const token = sessionStorage.getItem('sortv2_token');
    if (!token) return;

    apiService.getCurrentUser().then(res => {
      if (res?.user) {
        const u: User = { ...res.user, certificatesEarned: (res.user as any).certificatesEarned || (res.user as any).certificates || [] };
        setCurrentUser(u);
        setIsAuthenticated(true);
      }
    }).catch(() => {
      sessionStorage.removeItem('sortv2_token');
      sessionStorage.removeItem('sort_auth');
      setIsAuthenticated(false);
    });
  }, []);

  // Silent token refresh
  useEffect(() => {
    if (!isAuthenticated) return;
    const intervalId = setInterval(async () => {
      const refreshed = await apiService.refreshAccessToken();
      if (!refreshed) {
        const userId = sessionStorage.getItem('sortv2_user_id');
        if (userId) clearRefreshToken(userId);
        sessionStorage.removeItem('sortv2_token');
        sessionStorage.removeItem('sortv2_user_id');
        sessionStorage.removeItem('sort_auth');
        setIsAuthenticated(false);
      }
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [isAuthenticated]);

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

  const logout = () => {
    const userId = sessionStorage.getItem('sortv2_user_id');
    const refreshToken = userId ? localStorage.getItem(`sortv2_refresh_${userId}`) : null;
    if (refreshToken) {
      apiService.logout(refreshToken).catch(() => {});
    }
    if (userId) clearRefreshToken(userId);
    sessionStorage.removeItem('sortv2_token');
    sessionStorage.removeItem('sortv2_user_id');
    setIsAuthenticated(false);
    sessionStorage.setItem('sort_auth', 'false');
  };

  const changeRole = (newRole: Role, users: User[]) => {
    sessionStorage.setItem('sort_tab_role', newRole);
    const targetUser = users.find(u => u.role === newRole) || (currentUser ? { ...currentUser, role: newRole } : null);
    if (targetUser) {
      setCurrentUser(targetUser);
    }
  };

  return { currentUser, setCurrentUser, isAuthenticated, setIsAuthenticated, login, logout, changeRole };
}
