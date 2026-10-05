/**
 * Notification dismissal store (SMART master handoff Part 4 §4.1).
 * Dismissals are per portal + user and live in localStorage only — never in a
 * database — so one admin clearing an alert does not clear it for anyone else.
 */

const DISMISS_PREFIX = 'sortv2_notif_dismissed';

export function dismissKey(portal: string, userId: string): string {
  return `${DISMISS_PREFIX}_${portal}_${userId}`;
}

export function readDismissed(portal: string, userId: string): Set<string> {
  try {
    const raw = localStorage.getItem(dismissKey(portal, userId));
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    return new Set(
      Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : [],
    );
  } catch {
    return new Set();
  }
}

export function writeDismissed(portal: string, userId: string, ids: Set<string>): void {
  try {
    localStorage.setItem(dismissKey(portal, userId), JSON.stringify(Array.from(ids)));
  } catch {
    // Quota / private mode — dismissal is best effort.
  }
}

/**
 * Removes every dismissal record in this browser. Used by the Danger Zone
 * reset so a wiped feed cannot leave stale ids marked as dismissed.
 */
export function clearAllDismissals(): void {
  try {
    Object.keys(localStorage)
      .filter((key) => key.startsWith(DISMISS_PREFIX))
      .forEach((key) => localStorage.removeItem(key));
  } catch {
    // Storage unavailable — nothing to clear.
  }
}
