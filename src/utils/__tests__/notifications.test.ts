import { describe, expect, it } from 'vitest';
import {
  buildDispatchNotifications,
  buildVerifiedNotifications,
  filterNotificationsForUser,
  isNotificationForUser,
  NOTIFICATIONS_STORAGE_KEY,
} from '../notifications';
import type { AppNotification, Report, User } from '../../types';

function user(partial: Partial<User>): User {
  return {
    id: 'u-1',
    name: 'Test User',
    email: 't@example.com',
    employeeId: 'E1',
    role: 'STUDENT',
    points: 0,
    warningsCount: 0,
    certificatesEarned: [],
    ...partial,
  };
}

function notification(partial: Partial<AppNotification>): AppNotification {
  return {
    id: 'n-1',
    type: 'REPORT_SUBMITTED',
    title: 'T',
    message: 'M',
    reportId: 'r-1',
    timestamp: '2026-09-21T00:00:00.000Z',
    ...partial,
  };
}

function report(partial: Partial<Report>): Report {
  return {
    id: 'r-1',
    title: 'Waste',
    description: '',
    status: 'PENDING',
    urgency: 'MEDIUM',
    category: 'RECYCLABLE',
    lat: 0,
    lng: 0,
    locationName: 'Canteen',
    reporterId: 'u-1',
    reporterName: 'Test User',
    pointsAwarded: 0,
    timestamp: '2026-09-21T00:00:00.000Z',
    ...partial,
  } as Report;
}

describe('isNotificationForUser', () => {
  it('matches the exact recipient id', () => {
    const student = user({ id: 'u-1' });
    expect(isNotificationForUser(notification({ recipientId: 'u-1' }), student)).toBe(true);
  });

  it('never leaks another user\'s personal notification', () => {
    const student = user({ id: 'u-1' });
    expect(isNotificationForUser(notification({ recipientId: 'u-2' }), student)).toBe(false);
  });

  it('never leaks admin-queue alerts to students or teachers', () => {
    const student = user({ id: 'u-1', role: 'STUDENT' });
    const teacher = user({ id: 'u-2', role: 'TEACHER' });
    const adminAlert = notification({ recipientRole: 'ADMIN' });
    expect(isNotificationForUser(adminAlert, student)).toBe(false);
    expect(isNotificationForUser(adminAlert, teacher)).toBe(false);
  });

  it('delivers role-scoped alerts to that role only', () => {
    const admin = user({ id: 'u-3', role: 'ADMIN' });
    const mrf = user({ id: 'u-4', role: 'MRF' });
    const adminAlert = notification({ recipientRole: 'ADMIN' });
    expect(isNotificationForUser(adminAlert, admin)).toBe(true);
    expect(isNotificationForUser(adminAlert, mrf)).toBe(false);
  });

  it('rejects legacy magic-recipient rows', () => {
    const admin = user({ id: 'u-3', role: 'ADMIN' });
    const legacy = notification({ recipientId: 'admin' as string });
    expect(isNotificationForUser(legacy, admin)).toBe(false);
  });

  it('rejects notifications with no recipient at all', () => {
    expect(isNotificationForUser(notification({}), user({ id: 'u-1', role: 'ADMIN' }))).toBe(false);
  });

  it('returns nothing for signed-out visitors', () => {
    expect(filterNotificationsForUser([notification({ recipientId: 'u-1' })], null)).toEqual([]);
  });
});

describe('filterNotificationsForUser', () => {
  it('keeps only the signed-in user\'s rows', () => {
    const student = user({ id: 'u-1' });
    const feed = [
      notification({ id: 'n-1', recipientId: 'u-1' }),
      notification({ id: 'n-2', recipientId: 'u-2' }),
      notification({ id: 'n-3', recipientRole: 'ADMIN' }),
    ];
    expect(filterNotificationsForUser(feed, student).map(n => n.id)).toEqual(['n-1']);
  });
});

describe('buildVerifiedNotifications', () => {
  it('notifies each distinct reporter once', () => {
    const drafts = buildVerifiedNotifications([
      report({ id: 'r-1', reporterId: 'u-1' }),
      report({ id: 'r-2', reporterId: 'u-1' }),
      report({ id: 'r-3', reporterId: 'u-2' }),
    ]);
    expect(drafts).toHaveLength(2);
    expect(drafts.map(d => d.recipientId).sort()).toEqual(['u-1', 'u-2']);
    expect(drafts.every(d => d.type === 'REPORT_VERIFIED')).toBe(true);
  });

  it('produces no drafts for an empty stream', () => {
    expect(buildVerifiedNotifications([])).toEqual([]);
  });
});

describe('buildDispatchNotifications', () => {
  it('targets the reporter of each stream report', () => {
    const drafts = buildDispatchNotifications(
      [report({ id: 'r-1', reporterId: 'u-1', locationName: 'Canteen' })],
      'MRF One'
    );
    expect(drafts).toEqual([
      {
        type: 'REPORT_DISPATCHED',
        title: 'MRF Collector Dispatched',
        message: 'MRF staff MRF One has been assigned to collect waste at Canteen.',
        reportId: 'r-1',
        recipientId: 'u-1',
      },
    ]);
  });
});

describe('storage key', () => {
  it('uses a versioned key so the leaked legacy feed is ignored', () => {
    expect(NOTIFICATIONS_STORAGE_KEY).toBe('sort_notifications_v2');
  });
});
