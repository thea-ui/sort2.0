/**
 * Verifies the dedicated scheduler worker starts and logs its scheduler set.
 * Usage: node scripts/perf/worker-check.mjs
 * Runs dist/worker.js for ~7s, captures logs, then stops it.
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const serverDir = path.join(repoRoot, 'server');

const child = spawn(process.execPath, ['dist/worker.js'], {
  cwd: serverDir,
  env: { ...process.env, RUN_SCHEDULERS: 'true' },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let output = '';
child.stdout.on('data', (chunk) => {
  output += String(chunk);
});
child.stderr.on('data', (chunk) => {
  output += String(chunk);
});

const finish = (code) => {
  try {
    child.kill();
  } catch {
    /* already exited */
  }
  console.log(output.trim());
  console.log(`\n[worker-check] ${code === 0 ? 'PASS' : 'FAIL'}`);
  process.exit(code);
};

setTimeout(() => {
  const started = output.includes('[Worker] Scheduler process running');
  const hasSchedulerLog = /\[(Scheduler|BinReset|AtlasScheduler|Branding)\]/.test(output);
  if (!started || !hasSchedulerLog) {
    console.error('[worker-check] Worker did not log its scheduler set.');
    return finish(1);
  }
  finish(0);
}, 7000);

child.on('exit', (code) => {
  if (code !== 0) {
    console.error(`[worker-check] Worker exited early with code ${code}.`);
    finish(1);
  }
});
