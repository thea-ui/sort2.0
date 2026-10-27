import { prisma } from '../lib/prisma.js';
/**
 * Offline password-cache authentication.
 *
 * EnrollPro remains the password authority. After EnrollPro verifies a
 * password, SORT stores a bcrypt hash of it (never plaintext) plus timestamps
 * for when it was cached and when EnrollPro last verified it. The hash may be
 * used by the optional local-first fast path, and as the outage fallback —
 * bounded by a freshness window and an admin kill-switch. An online EnrollPro
 * response (including 401) never falls back to the cache, so a password change
 * on EnrollPro always wins while it is reachable.
 */
import bcrypt from 'bcryptjs';

export const BCRYPT_COST = 12;
export const DEFAULT_MAX_CACHE_DAYS = 30;
export const MAX_CACHE_DAYS = 365;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface OfflineAuthPolicy {
  enabled: boolean;
  maxDays: number;
}

export interface OfflineVerifyResult {
  ok: boolean;
  reason?: 'DISABLED' | 'NO_CACHE' | 'STALE' | 'BAD_PASSWORD';
}

export interface LocalPasswordCheck {
  hasHash: boolean;
  matches: boolean;
}

export interface LocalFastPathInput {
  enabled: boolean;
  hasLocalHash: boolean;
  localMatches: boolean;
  verifiedAt: Date | null;
  passwordChangeRequired: boolean;
  passwordResetRequired: boolean;
  revalidationDue: boolean;
}

export function clampMaxCacheDays(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_MAX_CACHE_DAYS;
  return Math.min(MAX_CACHE_DAYS, Math.max(1, Math.round(n)));
}

export function isCacheWithinWindow(
  cachedAt: Date | string | null | undefined,
  maxDays: number,
  now: Date = new Date()
): boolean {
  if (!cachedAt) return false;
  const cached = cachedAt instanceof Date ? cachedAt : new Date(cachedAt);
  if (Number.isNaN(cached.getTime())) return false;
  return now.getTime() - cached.getTime() <= clampMaxCacheDays(maxDays) * DAY_MS;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

export async function verifyPasswordHash(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Compare a password against the locally cached hash. This proves only that the
 * password matches the hash; callers must still require passwordVerifiedAt
 * before using it as a local-first login.
 */
export async function verifyLocalPassword(
  user: { passwordHash: string | null },
  password: string
): Promise<LocalPasswordCheck> {
  if (!user.passwordHash) return { hasHash: false, matches: false };
  return {
    hasHash: true,
    matches: await verifyPasswordHash(password, user.passwordHash),
  };
}

/**
 * A cached hash is eligible for the no-network fast path only when EnrollPro
 * has verified it, no password-change flag is set, and the optional
 * revalidation window has not elapsed.
 */
export function canUseLocalFastPath(input: LocalFastPathInput): boolean {
  return (
    input.enabled &&
    input.hasLocalHash &&
    input.localMatches &&
    input.verifiedAt !== null &&
    !input.passwordChangeRequired &&
    !input.passwordResetRequired &&
    !input.revalidationDue
  );
}

/**
 * `0` days means never revalidate while the hash still matches. A positive
 * value forces one EnrollPro check per user per window.
 */
export function isRevalidationDue(
  verifiedAt: Date | null | undefined,
  maxAgeDays: number,
  now: Date = new Date()
): boolean {
  if (!verifiedAt || !Number.isFinite(maxAgeDays) || maxAgeDays <= 0) return false;
  return now.getTime() - verifiedAt.getTime() > maxAgeDays * DAY_MS;
}

export async function getOfflineAuthPolicy(): Promise<OfflineAuthPolicy> {
  const row = await prisma.systemSetting.findUnique({
    where: { id: 'default_setting' },
    select: { offlineAuthCacheEnabled: true, offlineAuthCacheMaxDays: true },
  });

  return {
    enabled: row?.offlineAuthCacheEnabled ?? true,
    maxDays: clampMaxCacheDays(row?.offlineAuthCacheMaxDays ?? DEFAULT_MAX_CACHE_DAYS),
  };
}

/**
 * Refresh the offline verifier after a fully successful online login. Only
 * called once every gate (enrollment, suspension, must-change) has passed, so
 * a blocked account can never gain offline access.
 */
export async function cacheVerifiedPassword(userId: string, password: string): Promise<void> {
  try {
    const hash = await hashPassword(password);
    const now = new Date();
    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: hash,
        passwordCachedAt: now,
        passwordVerifiedAt: now,
        passwordChangeRequired: false,
        passwordResetRequired: false,
      },
    });
  } catch (error: any) {
    console.error('[OfflineAuth] Failed to cache password hash:', error?.message || error);
  }
}

export async function clearCachedPassword(userId: string): Promise<void> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: null, passwordCachedAt: null, passwordVerifiedAt: null },
    });
  } catch (error: any) {
    console.error('[OfflineAuth] Failed to clear cached password hash:', error?.message || error);
  }
}

export async function verifyOfflinePassword(
  user: { passwordHash: string | null; passwordCachedAt: Date | null },
  password: string
): Promise<OfflineVerifyResult> {
  const policy = await getOfflineAuthPolicy();
  if (!policy.enabled) return { ok: false, reason: 'DISABLED' };
  if (!user.passwordHash || !user.passwordCachedAt) return { ok: false, reason: 'NO_CACHE' };
  if (!isCacheWithinWindow(user.passwordCachedAt, policy.maxDays)) return { ok: false, reason: 'STALE' };

  const matches = await verifyPasswordHash(password, user.passwordHash);
  return matches ? { ok: true } : { ok: false, reason: 'BAD_PASSWORD' };
}
