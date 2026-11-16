#!/usr/bin/env node
/**
 * Static PWA contract checks for the production build.
 * Run after `npm run build`: npm run pwa:validate
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dist = path.join(root, 'dist');
const results = [];

function check(name, fn) {
  try {
    const detail = fn();
    results.push({ name, ok: true, detail: detail ?? '' });
  } catch (error) {
    results.push({ name, ok: false, detail: error?.message || String(error) });
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function pngSize(file) {
  const buffer = readFileSync(file);
  assert(buffer.subarray(1, 4).toString('ascii') === 'PNG', `${file} is not a PNG`);
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

const indexHtmlPath = path.join(dist, 'index.html');
const swPath = path.join(dist, 'sw.js');

check('dist/index.html exists', () => {
  assert(existsSync(indexHtmlPath), 'missing dist/index.html');
});

check('dist/sw.js exists', () => {
  assert(existsSync(swPath), 'missing dist/sw.js');
});

if (existsSync(indexHtmlPath)) {
  const html = readFileSync(indexHtmlPath, 'utf8');

  check('manifest link points at the dynamic API manifest', () => {
    assert(
      html.includes('rel="manifest" href="/api/settings/public/manifest.webmanifest"'),
      'missing manifest link'
    );
  });

  check('install metadata is present', () => {
    for (const needle of [
      'name="theme-color"',
      'rel="apple-touch-icon"',
      'name="apple-mobile-web-app-capable"',
      'name="mobile-web-app-capable"',
      'viewport-fit=cover',
    ]) {
      assert(html.includes(needle), `missing ${needle}`);
    }
  });

  check('early beforeinstallprompt capture exists', () => {
    assert(html.includes('beforeinstallprompt'), 'missing inline install capture');
  });

  check('icon files exist', () => {
    const icons = [
      ['pwa/icon-192.png', 192],
      ['pwa/icon-512.png', 512],
      ['pwa/icon-maskable-192.png', 192],
      ['pwa/icon-maskable-512.png', 512],
      ['pwa/apple-touch-icon.png', 180],
    ];
    for (const [file, size] of icons) {
      const absolute = path.join(dist, file);
      assert(existsSync(absolute), `missing dist/${file}`);
      const dims = pngSize(absolute);
      assert(
        dims.width === size && dims.height === size,
        `dist/${file} is ${dims.width}x${dims.height}, expected ${size}x${size}`
      );
    }
    return `${icons.length} icons`;
  });
}

if (existsSync(swPath)) {
  const sw = readFileSync(swPath, 'utf8');

  check('service worker size budget', () => {
    const size = statSync(swPath).size;
    assert(size <= 250 * 1024, `sw.js is ${Math.round(size / 1024)} KB (budget 250 KB)`);
    return `${Math.round(size / 1024)} KB`;
  });

  const precacheUrls = [...sw.matchAll(/\{url:"([^"]+)",revision:/g)].map((match) => match[1]);

  check('precache includes the app shell', () => {
    assert(precacheUrls.includes('index.html'), 'index.html is not precached');
    assert(
      precacheUrls.some((url) => /^assets\/index-[\w-]+\.js$/.test(url)),
      'main JS bundle is not precached'
    );
    assert(
      precacheUrls.some((url) => /^assets\/index-[\w-]+\.css$/.test(url)),
      'main CSS bundle is not precached'
    );
  });

  check('precache never contains API or report-photo URLs', () => {
    const forbidden = precacheUrls.filter(
      (url) => url.startsWith('api/') || url.startsWith('/api/') || url.includes('reports/')
    );
    assert(forbidden.length === 0, `forbidden precache entries: ${forbidden.join(', ')}`);
  });

  check('navigation fallback and API denylist are configured', () => {
    assert(sw.includes('createHandlerBoundToURL("/index.html")'), 'missing navigation fallback');
    assert(
      sw.includes('denylist:[/^\\/api\\//') || sw.includes('denylist:[/^\\/api\\/'),
      'missing /api navigation denylist'
    );
  });

  check('uploads-only runtime cache', () => {
    assert(sw.includes('cacheName:"sort-uploads"'), 'missing sort-uploads cache');
    assert(
      !/registerRoute\([^)]*\/api\//s.test(sw),
      'runtime route may target /api'
    );
  });

  check('precache size budget', () => {
    let total = 0;
    for (const url of precacheUrls) {
      const file = path.join(dist, url.replace(/^\//, ''));
      if (existsSync(file)) total += statSync(file).size;
    }
    assert(total <= 4 * 1024 * 1024, `precache is ${(total / 1024 / 1024).toFixed(2)} MB (budget 4 MB)`);
    return `${(total / 1024).toFixed(0)} KiB / ${precacheUrls.length} entries`;
  });
}

const failed = results.filter((result) => !result.ok);
for (const result of results) {
  console.log(`${result.ok ? 'PASS' : 'FAIL'}  ${result.name}${result.detail ? ` — ${result.detail}` : ''}`);
}

if (failed.length > 0) {
  console.error(`\n${failed.length} PWA contract check(s) failed.`);
  process.exit(1);
}

console.log(`\n${results.length} PWA contract checks passed.`);
