/**
 * Perf harness: stop the API started by boot-server.mjs.
 * Usage: node scripts/perf/stop-server.mjs
 * Note: on Windows the process is terminated via taskkill (graceful SIGTERM
 * shutdown logging is verified by running the server from a console instead).
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const logDir = path.join(tmpdir(), 'sort-logs');
const pidFile = path.join(logDir, 'server.pid');

if (!existsSync(pidFile)) {
  console.log('[stop-server] No PID file — nothing to stop.');
  process.exit(0);
}

const pid = Number(readFileSync(pidFile, 'utf8').trim());

function isAlive() {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

if (!isAlive()) {
  rmSync(pidFile, { force: true });
  console.log(`[stop-server] PID ${pid} is not running — cleaned stale PID file.`);
  process.exit(0);
}

if (process.platform === 'win32') {
  spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' });
} else {
  process.kill(pid, 'SIGTERM');
  const startedAt = Date.now();
  while (isAlive() && Date.now() - startedAt < 10_000) {
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  if (isAlive()) process.kill(pid, 'SIGKILL');
}

await new Promise((resolve) => setTimeout(resolve, 500));
rmSync(pidFile, { force: true });

if (isAlive()) {
  console.error(`[stop-server] PID ${pid} is still alive after stop attempt.`);
  process.exit(1);
}
console.log(`[stop-server] Stopped PID ${pid}.`);
