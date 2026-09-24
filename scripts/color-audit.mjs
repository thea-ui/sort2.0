import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { resolveToken } from './e2e/token.mjs';

const WEB_URL = process.env.AUDIT_WEB_URL || 'http://127.0.0.1:5174';
const API_URL = process.env.SMOKE_BASE_URL || 'http://localhost:5000';
const OUT_DIR = join(process.cwd(), 'test-results', 'color-audit');
const ROLES = ['ADMIN', 'MRF', 'TEACHER', 'STUDENT'];

mkdirSync(OUT_DIR, { recursive: true });

// Hue buckets that are never part of the brand/semantic system: the
// "generic web blue/purple/pink" family the audit is hunting for.
const OFF_BRAND_HUES = [
  { name: 'blue', min: 195, max: 260 },
  { name: 'violet', min: 260, max: 290 },
  { name: 'purple', min: 290, max: 320 },
  { name: 'pink', min: 320, max: 345 },
];

const ANALYZE = (hueBuckets) => {
  const parse = (value) => {
    const m = /rgba?\(([^)]+)\)/.exec(value || '');
    if (!m) return null;
    const [r, g, b, a] = m[1].split(',').map((n) => parseFloat(n));
    if (a !== undefined && a < 0.06) return null;
    return [r, g, b];
  };
  const rgbToHsl = (r, g, b) => {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    const d = max - min;
    if (d === 0) return [0, 0, l];
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h;
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
    return [h * 360, s, l];
  };
  const describe = (el) => {
    const cls = typeof el.className === 'string' ? el.className : '';
    return `${el.tagName.toLowerCase()}.${cls.split(/\s+/).filter(Boolean).slice(0, 4).join('.')}`.slice(0, 160);
  };

  const found = {};
  const samples = {};
  for (const el of Array.from(document.querySelectorAll('body *'))) {
    const rect = el.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) continue;
    const styles = getComputedStyle(el);
    for (const [prop, value] of [
      ['background', styles.backgroundColor],
      ['text', styles.color],
      ['border', styles.borderTopColor],
    ]) {
      const rgb = parse(value);
      if (!rgb) continue;
      const [h, s, l] = rgbToHsl(...rgb);
      if (s < 0.28 || l < 0.14 || l > 0.88) continue;
      const bucket = hueBuckets.find((b) => h >= b.min && h < b.max);
      if (!bucket) continue;
      const key = `${bucket.name}:${prop}`;
      found[key] = (found[key] || 0) + 1;
      if (!samples[key]) samples[key] = [];
      if (samples[key].length < 4) samples[key].push(describe(el));
    }
  }
  return { found, samples };
};

const report = {};

for (const role of ROLES) {
  const resolved = await resolveToken(API_URL, role);
  if (!resolved?.token) {
    console.log(`SKIP ${role}: no usable identity`);
    continue;
  }

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(
    ({ token, userId }) => {
      sessionStorage.setItem('sortv2_token', token);
      sessionStorage.setItem('sort_auth', 'true');
      if (userId) sessionStorage.setItem('sortv2_user_id', userId);
    },
    { token: resolved.token, userId: resolved.userId }
  );

  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 160));
  });

  await page.goto(WEB_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('nav', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(1200);

  const navButtons = page.locator('nav button:visible');
  const navCount = await navButtons.count();
  const roleReport = { tabs: [], consoleErrors };
  console.log(`\n${role}: auditing ${navCount} nav destinations`);

  for (let i = 0; i < navCount; i++) {
    const button = navButtons.nth(i);
    let label = `tab-${i}`;
    try {
      // Both reads and clicks live in the try: a click can re-render the nav
      // (e.g. Settings expands its submenu), invalidating earlier refs.
      label = ((await button.textContent({ timeout: 3000 })) || label)
        .trim()
        .replace(/\s+/g, ' ')
        .slice(0, 40);
      await button.click({ timeout: 5000 });
      await page.waitForTimeout(700);
    } catch {
      console.log(`  [${i}] ${label} - skipped (unstable)`);
      continue;
    }
    console.log(`  [${i}] ${label}`);
    const slug = `${role.toLowerCase()}-${String(i).padStart(2, '0')}-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    await page.screenshot({ path: join(OUT_DIR, `${slug}.png`), fullPage: false });
    const analysis = await page.evaluate(ANALYZE, OFF_BRAND_HUES);
    roleReport.tabs.push({ label, slug, ...analysis });
  }

  report[role] = roleReport;
  await browser.close();
}

writeFileSync(join(OUT_DIR, 'report.json'), JSON.stringify(report, null, 2));

console.log('\nOff-brand color occurrences (blue/violet/purple/pink families):');
console.log('(whitelisted: Bin Map / Facilities indicator #0091EA and its sky-blue family)');
let total = 0;
for (const [role, data] of Object.entries(report)) {
  const counts = {};
  for (const tab of data.tabs) {
    for (const [key, count] of Object.entries(tab.found)) {
      counts[key] = (counts[key] || 0) + count;
    }
  }
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  total += entries.reduce((sum, [, c]) => sum + c, 0);
  console.log(`\n${role}:`);
  if (entries.length === 0) console.log('  none');
  for (const [key, count] of entries) console.log(`  ${key} -> ${count}`);
  if (data.consoleErrors.length) console.log(`  console errors: ${data.consoleErrors.length}`);
}
console.log(`\nTOTAL off-brand occurrences: ${total}`);
console.log(`Screenshots + report: ${OUT_DIR}`);
