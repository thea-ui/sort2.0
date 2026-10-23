/**
 * Perf harness: boot the built SORTv2 API detached, logging to the OS temp dir.
 * Usage: node scripts/perf/boot-server.mjs
 * Logs:  <tmp>/sort-logs/server-out.log + server-err.log
 * PID:   <tmp>/sort-logs/server.pid
 * Requires: npm --prefix server run build (uses server/dist/index.js).
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, openSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const serverDir = path.join(repoRoot, 'server');
const entry = path.join(serverDir, 'dist', 'index.js');
const devCli = path.join(serverDir, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const mode = process.env.BOOT_MODE === 'dev' ? 'dev' : 'dist';
const logDir = path.join(tmpdir(), 'sort-logs');
const port = Number(process.env.PORT || process.env.SERVER_PORT || 5000);
const healthUrl = `http://localhost:${port}/health`;
const timeoutMs = Number(process.env.BOOT_TIMEOUT_MS || 30_000);

mkdirSync(logDir, { recursive: true });

async function healthOk() {
  try {
    const res = await fetch(healthUrl, { signal: AbortSignal.timeout(1500) });
    return res.ok;
  } catch {
    return false;
  }
}

if (await healthOk()) {
  console.log(`[boot-server] API already healthy on :${port} — nothing to start.`);
  process.exit(0);
}

if (mode === 'dist' && !existsSync(entry)) {
  console.error(`[boot-server] Missing ${entry} — run: npm --prefix server run build`);
  process.exit(1);
}
if (mode === 'dev' && !existsSync(devCli)) {
  console.error(`[boot-server] Missing tsx CLI at ${devCli} — run: npm --prefix server install`);
  process.exit(1);
}

const out = openSync(path.join(logDir, 'server-out.log'), 'a');
const err = openSync(path.join(logDir, 'server-err.log'), 'a');
const child = spawn(
  process.execPath,
  mode === 'dev' ? [devCli, 'watch', 'src/index.ts'] : [entry],
  {
    cwd: serverDir,
    detached: true,
    windowsHide: true,
    stdio: ['ignore', out, err],
  }
);
child.unref();
writeFileSync(path.join(logDir, 'server.pid'), String(child.pid));

const startedAt = Date.now();
let healthy = false;
while (Date.now() - startedAt < timeoutMs) {
  if (await healthOk()) {
    healthy = true;
    break;
  }
  await new Promise((resolve) => setTimeout(resolve, 500));
}

if (!healthy) {
  console.error(`[boot-server] API did not become healthy within ${timeoutMs} ms (PID ${child.pid}).`);
  console.error(`[boot-server] Check ${path.join(logDir, 'server-err.log')}`);
  process.exit(1);
}

console.log(`[boot-server] API healthy on :${port} (PID ${child.pid}, mode ${mode}).`);
console.log(`[boot-server] Logs: ${logDir}`);
