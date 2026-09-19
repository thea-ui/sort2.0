import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const localPath = join(here, 'credentials.local.json');
const examplePath = join(here, 'credentials.example.json');

export function loadE2EConfig() {
  const path = existsSync(localPath) ? localPath : examplePath;
  const cfg = JSON.parse(readFileSync(path, 'utf8'));
  cfg.baseUrl = process.env.SMOKE_BASE_URL || cfg.baseUrl;
  cfg.webUrl = process.env.SMOKE_WEB_URL || cfg.webUrl;
  return cfg;
}

export async function login(baseUrl, account) {
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: account.identifier, password: account.password }),
  });
  const body = await res.json().catch(() => ({}));
  return {
    ok: res.ok,
    status: res.status,
    token: body.token || body.accessToken || null,
    refreshToken: body.refreshToken || null,
    body,
  };
}
