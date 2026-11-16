#!/usr/bin/env node
/**
 * Deploy smoke for the installable PWA.
 * Usage: PWA_BASE_URL=https://sort.example.ts.net npm run pwa:smoke
 *
 * Set PWA_REQUIRE_CACHE_HEADERS=1 on staging/production to fail when the
 * proxy does not serve sw.js with a revalidating cache policy.
 */
const baseUrl = (process.env.PWA_BASE_URL || 'http://127.0.0.1:5174').replace(/\/+$/, '');
const requireCacheHeaders = process.env.PWA_REQUIRE_CACHE_HEADERS === '1';
const results = [];

function record(name, ok, detail = '') {
  results.push({ name, ok, detail });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function pngSize(buffer) {
  assert(buffer.subarray(1, 4).toString('ascii') === 'PNG', 'not a PNG');
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

async function run() {
  console.log(`[pwa:smoke] ${baseUrl}`);

  let manifest;
  try {
    const response = await fetch(`${baseUrl}/api/settings/public/manifest.webmanifest`, {
      headers: { Accept: 'application/manifest+json' },
    });
    const contentType = response.headers.get('content-type') || '';
    assert(response.status === 200, `manifest HTTP ${response.status}`);
    assert(contentType.includes('application/manifest+json'), `manifest content-type "${contentType}"`);
    manifest = await response.json();
    record('manifest responds 200 with application/manifest+json', true);
  } catch (error) {
    record('manifest responds 200 with application/manifest+json', false, error.message);
  }

  if (manifest) {
    try {
      assert(manifest.id === '/', 'manifest id must be /');
      assert(manifest.start_url === '/', 'start_url must be /');
      assert(manifest.scope === '/', 'scope must be /');
      assert(manifest.display === 'standalone', 'display must be standalone');
      assert(/^#[0-9a-f]{6}$/i.test(manifest.theme_color), 'theme_color must be hex');
      assert(Array.isArray(manifest.icons) && manifest.icons.length >= 2, 'icons missing');
      assert(
        manifest.icons.some((icon) => icon.sizes === '192x192' && icon.purpose === 'any'),
        'missing 192px any icon'
      );
      assert(
        manifest.icons.some((icon) => icon.sizes === '512x512' && icon.purpose === 'any'),
        'missing 512px any icon'
      );
      record('manifest fields are installable', true, `${manifest.name} / ${manifest.short_name}`);
    } catch (error) {
      record('manifest fields are installable', false, error.message);
    }

    const iconEntries = manifest.icons
      .filter((icon) => icon.purpose !== 'maskable')
      .slice(0, 1);
    for (const icon of iconEntries) {
      try {
        const url = new URL(icon.src, baseUrl).toString();
        const response = await fetch(url);
        assert(response.status === 200, `${icon.src} HTTP ${response.status}`);
        const contentType = response.headers.get('content-type') || '';
        assert(contentType.includes('image/png'), `${icon.src} content-type "${contentType}"`);
        const dims = pngSize(Buffer.from(await response.arrayBuffer()));
        const [expected] = icon.sizes.split('x').map(Number);
        assert(dims.width === expected && dims.height === expected, `${icon.src} is ${dims.width}x${dims.height}`);
        record(`icon ${icon.sizes} is fetchable PNG`, true, icon.src);
      } catch (error) {
        record(`icon ${icon.sizes} is fetchable PNG`, false, error.message);
      }
    }
  }

  try {
    const response = await fetch(`${baseUrl}/sw.js`);
    const cacheControl = response.headers.get('cache-control') || '';
    assert(response.status === 200, `sw.js HTTP ${response.status}`);
    const revalidating = /no-cache|max-age=0/i.test(cacheControl);
    if (requireCacheHeaders) assert(revalidating, `sw.js Cache-Control "${cacheControl}"`);
    record('sw.js responds 200', true, revalidating ? 'revalidating headers' : `cache-control "${cacheControl || 'unset'}"`);
  } catch (error) {
    record('sw.js responds 200', false, error.message);
  }

  try {
    const response = await fetch(`${baseUrl}/`);
    const html = await response.text();
    assert(response.status === 200, `GET / HTTP ${response.status}`);
    assert(html.includes('/api/settings/public/manifest.webmanifest'), 'manifest link missing from HTML');
    assert(html.includes('rel="apple-touch-icon"'), 'apple-touch-icon missing from HTML');
    assert(html.includes('name="theme-color"'), 'theme-color missing from HTML');
    record('root HTML carries install metadata', true);
  } catch (error) {
    record('root HTML carries install metadata', false, error.message);
  }

  for (const result of results) {
    console.log(`${result.ok ? 'PASS' : 'FAIL'}  ${result.name}${result.detail ? ` — ${result.detail}` : ''}`);
  }

  const failed = results.filter((result) => !result.ok);
  if (failed.length > 0) {
    console.error(`\n${failed.length} PWA smoke check(s) failed.`);
    process.exit(1);
  }
  console.log(`\n${results.length} PWA smoke checks passed.`);
}

run().catch((error) => {
  console.error('[pwa:smoke] fatal:', error);
  process.exit(1);
});
