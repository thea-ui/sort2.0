import { useState, useEffect } from 'react';
import { AppNotification, NotificationDraft } from '../types';
import { LEGACY_NOTIFICATIONS_STORAGE_KEY, NOTIFICATIONS_STORAGE_KEY } from '../utils/notifications';

function loadStoredNotifications(): AppNotification[] {
  try {
    // Drop the legacy feed: it used the magic recipient 'admin' and leaked
    // admin alerts to every other signed-in role on this browser.
    localStorage.removeItem(LEGACY_NOTIFICATIONS_STORAGE_KEY);
    const raw = JSON.parse(localStorage.getItem(NOTIFICATIONS_STORAGE_KEY) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function buildNotification(draft: NotificationDraft, timestamp: string): AppNotification {
  return {
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ...draft,
    timestamp,
  };
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>(loadStoredNotifications);

  useEffect(() => {
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications));
  }, [notifications]);

  const addNotification = (draft: NotificationDraft) => {
    setNotifications(prev => [buildNotification(draft, new Date().toISOString()), ...prev]);
  };

  const addNotifications = (drafts: NotificationDraft[]) => {
    if (drafts.length === 0) return;
    const timestamp = new Date().toISOString();
    setNotifications(prev => [...drafts.map(draft => buildNotification(draft, timestamp)), ...prev]);
  };

  const dismissNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  const clearNotificationsForUser = (userId: string) => {
    setNotifications(prev => prev.filter(n => n.recipientId !== userId));
  };

  return {
    notifications,
    setNotifications,
    addNotification,
    addNotifications,
    dismissNotification,
    clearNotificationsForUser,
  };
}
