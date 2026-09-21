import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Page } from '@playwright/test';

// Plain ESM helper shared with the node smoke scripts.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - no type declarations for the .mjs helper
import { resolveToken } from '../../../scripts/e2e/token.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const credentialsPath = join(here, '..', '..', '..', 'scripts', 'e2e', 'credentials.local.json');

export const API_URL = process.env.SMOKE_BASE_URL || 'http://localhost:5000';

export type UiRole = 'STUDENT' | 'TEACHER' | 'MRF' | 'ADMIN';

function loadAccounts(): Record<string, { identifier: string; password: string } | undefined> {
  if (!existsSync(credentialsPath)) return {};
  try {
    const parsed = JSON.parse(readFileSync(credentialsPath, 'utf8'));
    return parsed?.accounts ?? {};
  } catch {
    return {};
  }
}

/**
 * Seed a real session into sessionStorage before the app boots.
 * Uses real login first; falls back to a locally minted test token when the
 * auth provider is unavailable (plan §12.10). Returns false when no usable
 * identity exists (test should skip, never silently pass).
 */
export async function seedSession(page: Page, role: UiRole): Promise<boolean> {
  const accounts = loadAccounts();
  const account = accounts[role.toLowerCase()];
  const resolved = await resolveToken(API_URL, role, account);
  if (!resolved?.token) return false;

  await page.addInitScript(
    ({ token, userId }) => {
      sessionStorage.setItem('sortv2_token', token);
      sessionStorage.setItem('sort_auth', 'true');
      if (userId) sessionStorage.setItem('sortv2_user_id', userId);
    },
    { token: resolved.token, userId: resolved.userId }
  );

  return true;
}
