/**
 * Perf harness: scan the boot-server logs for error signatures.
 * Usage: node scripts/perf/log-scan.mjs [--strict] [--pattern "regex"]
 * --strict exits 2 when any match is found (gate mode).
 */
import { existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const logDir = path.join(tmpdir(), 'sort-logs');
const files = ['server-out.log', 'server-err.log'].map((name) => path.join(logDir, name));
const strict = process.argv.includes('--strict');
const patternIndex = process.argv.indexOf('--pattern');
const patternSource =
  patternIndex !== -1 && process.argv[patternIndex + 1]
    ? process.argv[patternIndex + 1]
    : 'ERROR|Uncaught|Unhandled|EADDRINUSE|P2028|P1001|pool timeout|timed out';

const regex = new RegExp(patternSource);

let total = 0;
for (const file of files) {
  if (!existsSync(file)) continue;
  const lines = readFileSync(file, 'utf8').split(/\r?\n/);
  const matches = [];
  lines.forEach((line, index) => {
    if (regex.test(line)) matches.push({ index: index + 1, line: line.trim() });
  });
  total += matches.length;
  console.log(`\n=== ${path.basename(file)} — ${matches.length} match(es) ===`);
  for (const match of matches.slice(-15)) {
    console.log(`  ${match.index}: ${match.line}`);
  }
}

console.log(`\n[log-scan] Total matches: ${total} (pattern: ${patternSource})`);
if (strict && total > 0) {
  console.error('[log-scan] STRICT mode: matches found — gate failed.');
  process.exit(2);
}
