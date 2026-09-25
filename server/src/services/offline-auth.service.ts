/**
 * Break-glass offline authentication.
 *
 * SORT never stores an EnrollPro credential: login is delegated to EnrollPro
 * and fails closed when it is unreachable. This service backs an EXPLICIT,
 * time-boxed fallback that only works while an administrator has enabled it and
 * EnrollPro is actually down.
 *
 * The credential is a SORT-local PIN, stored bcrypt-hashed in its own column so
 * it can never be confused with (or substituted for) an EnrollPro password.
 * Every attempt — success or failure — is written to `offline_auth_logs`, and
 * enabling/disabling writes an `audit_logs` row.
 */
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { getProviderStatus } from './enrollpro-health.service.js';

const prisma = new PrismaClient();

export const OFFLINE_PIN_MIN_LENGTH = 6;
export const OFFLINE_PIN_MAX_LENGTH = 8;
export const MAX_OFFLINE_HOURS = 72;

const BCRYPT_COST = 12;
const FAILURE_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES_PER_WINDOW = 5;

export interface OfflineAuthState {
  enabled: boolean;
  expiresAt: string | null;
  enabledBy: string | null;
  /** True when the window has elapsed; treated as disabled. */
  expired: boolean;
}

export interface OfflineAuthActor {
  name: string;
  role: string;
}

export class OfflinePinValidationError extends Error {}

const PIN_PATTERN = /^[0-9]+$/;

export function assertValidOfflinePin(pin: string): void {
  if (!PIN_PATTERN.test(pin)) {
    throw new OfflinePinValidationError('Offline PIN must contain digits only.');
  }
  if (pin.length < OFFLINE_PIN_MIN_LENGTH || pin.length > OFFLINE_PIN_MAX_LENGTH) {
    throw new OfflinePinValidationError(
      `Offline PIN must be ${OFFLINE_PIN_MIN_LENGTH}-${OFFLINE_PIN_MAX_LENGTH} digits.`
    );
  }
  const weak = new Set(['123456', '654321', '111111', '000000', '112233', '123123', '121212']);
  if (weak.has(pin)) {
    throw new OfflinePinValidationError('That PIN is too easy to guess. Choose a different one.');
  }
}

export async function getOfflineAuthState(): Promise<OfflineAuthState> {
  const row = await prisma.systemSetting.findUnique({
    where: { id: 'default_setting' },
    select: { offlineAuthEnabled: true, offlineAuthExpiresAt: true, offlineAuthEnabledBy: true },
  });

  const expiresAt = row?.offlineAuthExpiresAt ?? null;
  const expired = expiresAt !== null && expiresAt.getTime() <= Date.now();

  return {
    enabled: Boolean(row?.offlineAuthEnabled) && !expired,
    expiresAt: expiresAt ? expiresAt.toISOString() : null,
    enabledBy: row?.offlineAuthEnabledBy ?? null,
    expired,
  };
}

async function writeAudit(actionType: string, actor: OfflineAuthActor, details: Record<string, unknown>): Promise<void> {
  await prisma.auditLog
    .create({
      data: {
        actorName: actor.name,
        actorRole: actor.role,
        actionType,
        details: JSON.stringify(details),
      },
    })
    .catch((err) => console.error('[OfflineAuth] Failed to write audit row:', err.message));
}

/**
 * Enable or disable the fallback. Enabling always caps the window at
 * MAX_OFFLINE_HOURS so an emergency toggle cannot silently become permanent.
 * Disabling revokes every outstanding BREAK_GLASS refresh token immediately.
 */
export async function setOfflineAuthEnabled(
  enabled: boolean,
  actor: OfflineAuthActor,
  options: { hours?: number; reason?: string } = {}
): Promise<OfflineAuthState> {
  if (enabled) {
    const requested = options.hours ?? MAX_OFFLINE_HOURS;
    const hours = Number.isFinite(requested)
      ? Math.min(Math.max(requested, 1), MAX_OFFLINE_HOURS)
      : MAX_OFFLINE_HOURS;
    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
    await prisma.systemSetting.upsert({
      where: { id: 'default_setting' },
      update: {
        offlineAuthEnabled: true,
        offlineAuthExpiresAt: expiresAt,
        offlineAuthEnabledBy: actor.name,
        offlineAuthEnabledAt: new Date(),
      },
      create: {
        id: 'default_setting',
        offlineAuthEnabled: true,
        offlineAuthExpiresAt: expiresAt,
        offlineAuthEnabledBy: actor.name,
        offlineAuthEnabledAt: new Date(),
      },
    });
    await writeAudit('OFFLINE_AUTH_ENABLED', actor, {
      hours,
      expiresAt: expiresAt.toISOString(),
      reason: options.reason ?? null,
    });
    console.log(`[OfflineAuth] Enabled by ${actor.name} for ${hours}h (until ${expiresAt.toISOString()})`);
  } else {
    const revoked = await prisma.userSession.deleteMany({ where: { kind: 'BREAK_GLASS' } });
    await prisma.systemSetting.upsert({
      where: { id: 'default_setting' },
      update: { offlineAuthEnabled: false, offlineAuthExpiresAt: null },
      create: { id: 'default_setting', offlineAuthEnabled: false, offlineAuthExpiresAt: null },
    });
    await writeAudit('OFFLINE_AUTH_DISABLED', actor, {
      revokedBreakGlassSessions: revoked.count,
      reason: options.reason ?? null,
    });
    console.log(`[OfflineAuth] Disabled by ${actor.name}; revoked ${revoked.count} break-glass session(s)`);
  }

  return getOfflineAuthState();
}

export async function setOfflinePin(userId: string, pin: string): Promise<void> {
  assertValidOfflinePin(pin);
  const hash = await bcrypt.hash(pin, BCRYPT_COST);
  await prisma.user.update({
    where: { id: userId },
    data: { offlinePinHash: hash, offlinePinSetAt: new Date() },
  });
}

export async function clearOfflinePin(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { offlinePinHash: null, offlinePinSetAt: null },
  });
}

export interface OfflinePinResult {
  ok: boolean;
  lockedOut?: boolean;
  reason?: string;
}

async function countRecentFailures(userId: string): Promise<number> {
  return prisma.offlineAuthLog.count({
    where: {
      userId,
      success: false,
      createdAt: { gt: new Date(Date.now() - FAILURE_WINDOW_MS) },
    },
  });
}

async function record(userId: string, success: boolean, meta: { reason?: string; ip?: string; device?: string }): Promise<void> {
  await prisma.offlineAuthLog
    .create({
      data: {
        userId,
        success,
        reason: meta.reason ?? null,
        ipAddress: meta.ip ?? null,
        deviceInfo: meta.device ? meta.device.slice(0, 300) : null,
      },
    })
    .catch((err) => console.error('[OfflineAuth] Failed to write auth log:', err.message));
}

/**
 * Verify an offline PIN. Fails closed and never reveals whether a PIN exists:
 * a missing PIN, a wrong PIN, and an unknown user are indistinguishable to the
 * caller. Repeated failures lock the account out of the fallback for a window.
 */
export async function verifyOfflinePin(
  userId: string,
  pin: string,
  meta: { ip?: string; device?: string } = {}
): Promise<OfflinePinResult> {
  if ((await countRecentFailures(userId)) >= MAX_FAILURES_PER_WINDOW) {
    await record(userId, false, { reason: 'LOCKED_OUT', ...meta });
    return { ok: false, lockedOut: true, reason: 'Too many failed offline PIN attempts.' };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { offlinePinHash: true },
  });

  if (!user?.offlinePinHash) {
    await record(userId, false, { reason: 'NO_PIN_SET', ...meta });
    return { ok: false, reason: 'No offline PIN is set for this account.' };
  }

  const matches = await bcrypt.compare(pin, user.offlinePinHash);
  if (!matches) {
    await record(userId, false, { reason: 'BAD_PIN', ...meta });
    return { ok: false, reason: 'Offline PIN did not match.' };
  }

  await record(userId, true, meta);
  return { ok: true };
}

/**
 * Auto-revert: once EnrollPro is reachable again the fallback must not stay
 * armed. Requires two consecutive successful probes so a single blip does not
 * strand users mid-outage.
 */
export async function reconcileOfflineAuthWithProvider(
  probe: () => Promise<{ online: boolean }> = getProviderStatus
): Promise<void> {
  const state = await getOfflineAuthState();
  if (!state.enabled) {
    await resetOnlineStreak();
    return;
  }

  const provider = await probe();
  const next = nextOnlineStreak(await readOnlineStreak(), provider.online);
  if (!next.shouldDisable) {
    await writeOnlineStreak(next.streak);
    return;
  }

  await resetOnlineStreak();
  await setOfflineAuthEnabled(false, { name: 'auto-recovery', role: 'SYSTEM' }, {
    reason: 'EnrollPro became reachable again',
  });
}

/**
 * Pure streak rule for auto-revert: any failed probe resets the count, and only
 * the second consecutive success disables the fallback.
 */
export function nextOnlineStreak(current: number, online: boolean): { streak: number; shouldDisable: boolean } {
  if (!online) return { streak: 0, shouldDisable: false };
  const streak = current + 1;
  return streak >= 2 ? { streak: 0, shouldDisable: true } : { streak, shouldDisable: false };
}

// The streak is process-local: it only needs to survive between scheduler ticks.
let onlineStreak = 0;
async function readOnlineStreak(): Promise<number> {
  return onlineStreak;
}
async function writeOnlineStreak(value: number): Promise<void> {
  onlineStreak = value;
}
async function resetOnlineStreak(): Promise<void> {
  onlineStreak = 0;
}
