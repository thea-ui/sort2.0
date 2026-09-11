import { useState, useEffect } from 'react';
import { AppNotification } from '../types';

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try { return JSON.parse(localStorage.getItem('sort_notifications') || '[]'); } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem('sort_notifications', JSON.stringify(notifications));
  }, [notifications]);

  const addNotification = (type: AppNotification['type'], title: string, message: string, reportId: string, recipientId: string) => {
    const notif: AppNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      title,
      message,
      reportId,
      recipientId,
      timestamp: new Date().toISOString(),
    };
    setNotifications(prev => [notif, ...prev]);
  };

  const dismissNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  const clearNotificationsForUser = (userId: string) => {
    setNotifications(prev => prev.filter(n => n.recipientId !== userId));
  };

  return { notifications, setNotifications, addNotification, dismissNotification, clearNotificationsForUser };
}
