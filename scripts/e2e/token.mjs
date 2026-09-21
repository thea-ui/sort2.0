import crypto from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { login } from './config.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const envPath = join(here, '..', '..', 'server', '.env');

/**
 * Test-only token acquisition.
 *
 * Preferred path: real `POST /api/auth/login` (delegated to EnrollPro).
 * Fallback (documented in ATLAS_MAP_INTEGRATION_PLAN.md §12.10): when the auth
 * provider is unreachable (503) or refuses an archived local account (403),
 * sign a short-lived HS256 JWT with the local JWT_SECRET. The production
 * middleware verifies it identically, so role boundaries stay genuinely tested.
 * Never logged; never exported.
 */
export function loadJwtSecret() {
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32) return process.env.JWT_SECRET;
  if (!existsSync(envPath)) return null;
  const content = readFileSync(envPath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const match = /^\s*JWT_SECRET\s*=\s*(.*?)\s*$/.exec(line);
    if (!match) continue;
    let value = match[1];
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    return value || null;
  }
  return null;
}

function base64url(input) {
  return Buffer.from(input).toString('base64url');
}

export function signTestToken({ secret, userId, role, name = 'ATLAS Test Token', ttlSeconds = 900 }) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = { id: userId, role, name, iat: now, exp: now + ttlSeconds };
  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const signature = crypto.createHmac('sha256', secret).update(signingInput).digest('base64url');
  return `${signingInput}.${signature}`;
}

export async function pickUserIds(baseUrl, role, limit = 10) {
  try {
    const res = await fetch(`${baseUrl}/api/users`);
    if (!res.ok) return [];
    const users = await res.json();
    if (!Array.isArray(users)) return [];
    return users
      .filter((u) => u.role === role && u.id)
      .slice(0, limit)
      .map((u) => u.id);
  } catch {
    return [];
  }
}

// Cache resolved tokens per process so repeated test cases do not hammer the
// login rate limiter (failed attempts count against it).
const tokenCache = new Map();
const TOKEN_CACHE_TTL_MS = 10 * 60 * 1000;

export async function resolveToken(baseUrl, role, account) {
  const cacheKey = `${baseUrl}|${role}`;
  const cached = tokenCache.get(cacheKey);
  if (cached && Date.now() - cached.at < TOKEN_CACHE_TTL_MS) {
    return { ...cached.value, cached: true };
  }

  const result = { token: null, source: null, loginStatus: null, userId: null };

  if (account?.identifier && !String(account.identifier).startsWith('<')) {
    try {
      const attempt = await login(baseUrl, account);
      result.loginStatus = attempt.status;
      if (attempt.ok && attempt.token) {
        result.token = attempt.token;
        result.source = 'login';
        result.userId = attempt.body?.user?.id || null;
        tokenCache.set(cacheKey, { value: { ...result }, at: Date.now() });
        return result;
      }
    } catch {
      result.loginStatus = 'network';
    }
  }

  const secret = loadJwtSecret();
  if (!secret) return result;

  // Minted tokens only work end-to-end when the id belongs to an existing,
  // servable user (`/auth/me` rejects archived learners etc.), so probe
  // candidates and use the first one that authenticates.
  const candidates = await pickUserIds(baseUrl, role);
  if (candidates.length === 0) candidates.push(crypto.randomUUID());

  for (const userId of candidates) {
    const token = signTestToken({ secret, userId, role });
    try {
      const me = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (me.ok) {
        result.token = token;
        result.source = 'minted';
        result.userId = userId;
        tokenCache.set(cacheKey, { value: { ...result }, at: Date.now() });
        return result;
      }
    } catch {
      break;
    }
  }

  return result;
}
