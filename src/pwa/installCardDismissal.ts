/**
 * Per-user dismissal for the one-time mobile install card. The card and the
 * profile-menu row share this state so only one install control is visible at
 * a time in the student/teacher shell.
 */
const DISMISS_KEY_PREFIX = 'sortv2_pwa_install_card_dismissed_v1_';
export const INSTALL_CARD_DISMISSED_EVENT = 'sort:pwa-install-card-dismissed';

export function installCardKey(userId: string): string {
  return `${DISMISS_KEY_PREFIX}${userId}`;
}

export function readInstallCardDismissed(userId: string): boolean {
  try {
    return localStorage.getItem(installCardKey(userId)) === '1';
  } catch {
    return false;
  }
}

export function setInstallCardDismissed(userId: string): void {
  try {
    localStorage.setItem(installCardKey(userId), '1');
  } catch {
    // Best effort: private mode must not break the dashboard.
  }
  window.dispatchEvent(new CustomEvent(INSTALL_CARD_DISMISSED_EVENT, { detail: { userId } }));
}
