import { AppNotification, NotificationDraft, Report, User } from '../types';

/**
 * Storage key for the notification feed. Bumped from `sort_notifications`
 * because the legacy feed used the magic recipient `'admin'`, which leaked
 * admin alerts into every student/teacher bell.
 */
export const NOTIFICATIONS_STORAGE_KEY = 'sort_notifications_v2';

export const LEGACY_NOTIFICATIONS_STORAGE_KEY = 'sort_notifications';

/**
 * Single source of truth for "does this notification belong to this user?".
 * A notification is visible only when it targets the user's exact id or the
 * user's role explicitly — there is no broadcast fallback.
 */
export function isNotificationForUser(
  notification: AppNotification,
  user: User | null | undefined
): boolean {
  if (!user) return false;
  if (notification.recipientId && notification.recipientId === user.id) return true;
  if (notification.recipientRole && notification.recipientRole === user.role) return true;
  return false;
}

export function filterNotificationsForUser(
  notifications: AppNotification[],
  user: User | null | undefined
): AppNotification[] {
  if (!user) return [];
  return notifications.filter(n => isNotificationForUser(n, user));
}

function uniqueReporterIds(reports: Report[]): string[] {
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const report of reports) {
    if (!report.reporterId || seen.has(report.reporterId)) continue;
    seen.add(report.reporterId);
    ids.push(report.reporterId);
  }
  return ids;
}

/** Drafts notifying each distinct reporter that their report was verified. */
export function buildVerifiedNotifications(reports: Report[]): NotificationDraft[] {
  return uniqueReporterIds(reports).map(reporterId => {
    const report = reports.find(r => r.reporterId === reporterId) as Report;
    return {
      type: 'REPORT_VERIFIED',
      title: 'Report Verified',
      message: `Your report at ${report.locationName} was verified. Points have been awarded.`,
      reportId: report.id,
      recipientId: reporterId,
    };
  });
}

/** Drafts notifying each distinct reporter that a collector was dispatched. */
export function buildDispatchNotifications(reports: Report[], mrfName: string): NotificationDraft[] {
  const seen = new Set<string>();
  const drafts: NotificationDraft[] = [];
  for (const report of reports) {
    if (!report.reporterId || seen.has(report.reporterId)) continue;
    seen.add(report.reporterId);
    drafts.push({
      type: 'REPORT_DISPATCHED',
      title: 'MRF Collector Dispatched',
      message: `MRF staff ${mrfName} has been assigned to collect waste at ${report.locationName}.`,
      reportId: report.id,
      recipientId: report.reporterId,
    });
  }
  return drafts;
}
