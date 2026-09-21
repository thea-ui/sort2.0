import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  AtlasFetchError,
  diffAtlasCounts,
  fetchAtlasBuildings,
  getAtlasConfig,
  hashNormalizedMap,
  normalizeAtlasPayload,
  type AtlasRawPayload,
} from '../atlas-map.service.js';
import {
  downloadCampusImage,
  hashBytes,
  resolveCampusImageUrl,
  syncCampusImage,
} from '../atlas-map-image.service.js';

const fixtureUrl = new URL('./fixtures/atlas-buildings.sample.json', import.meta.url);
const fixture = JSON.parse(fs.readFileSync(fixtureUrl, 'utf8')) as AtlasRawPayload;

// ── T1: normalization ─────────────────────────────────────────────────

test('T1 normalize: fixture maps 9 buildings / 103 rooms in stable order', () => {
  const normalized = normalizeAtlasPayload(fixture);
  assert.equal(normalized.buildings.length, 9);
  const rooms = normalized.buildings.reduce((acc, b) => acc + b.rooms.length, 0);
  assert.equal(rooms, 103);

  const ids = normalized.buildings.map((b) => b.atlasId);
  assert.deepEqual(ids, [...ids].sort((a, b) => a - b));

  const speechLab = normalized.buildings.find((b) => b.atlasId === 60);
  assert.ok(speechLab, 'Speech Lab (0 rooms) must survive normalization');
  assert.equal(speechLab!.rooms.length, 0);
  assert.equal(speechLab!.name, 'Speech Lab');

  const g7 = normalized.buildings.find((b) => b.atlasId === 1)!;
  assert.equal(g7.shortCode, 'G7AW');
  assert.equal(g7.isTeachingBuilding, true);
  assert.equal(g7.floorCount, 4);
  assert.ok(g7.rooms.length === 20);
});

test('T1b normalize: non-finite and negative geometry is sanitized, never NaN', () => {
  const payload: AtlasRawPayload = {
    buildings: [
      {
        id: 7,
        name: 'Broken Geometry',
        x: Number.NaN,
        y: Number.POSITIVE_INFINITY,
        width: -50,
        height: Number.NaN,
        rotation: Number.NaN,
      },
    ],
  };
  const normalized = normalizeAtlasPayload(payload);
  const b = normalized.buildings[0];
  assert.equal(b.x, 0);
  assert.equal(b.y, 0);
  assert.equal(b.width, 0);
  assert.equal(b.height, 0);
  assert.equal(b.rotation, 0);
  assert.ok(Number.isFinite(b.x + b.y + b.width + b.height + b.rotation));
});

test('T1c normalize: duplicate atlasIds -> last wins; unicode + unknown room type preserved', () => {
  const payload: AtlasRawPayload = {
    buildings: [
      { id: 5, name: 'First', x: 1, y: 1, width: 10, height: 10 },
      { id: 5, name: 'Second', x: 2, y: 2, width: 20, height: 20 },
    ],
  };
  const normalized = normalizeAtlasPayload(payload);
  assert.equal(normalized.buildings.length, 1);
  assert.equal(normalized.buildings[0].name, 'Second');

  const unicodePayload: AtlasRawPayload = {
    buildings: [
      {
        id: 9,
        name: 'Aula de Educación – 教育棟',
        x: 0,
        y: 0,
        width: 10,
        height: 10,
        rooms: [{ id: 90, name: 'Robotics Bay 🦾', floor: 1, type: 'robotics_bay' }],
      },
    ],
  };
  const u = normalizeAtlasPayload(unicodePayload);
  assert.equal(u.buildings[0].name, 'Aula de Educación – 教育棟');
  assert.equal(u.buildings[0].rooms[0].name, 'Robotics Bay 🦾');
  assert.equal(u.buildings[0].rooms[0].type, 'ROBOTICS_BAY');
});

test('T1d normalize: invalid ids are dropped, not persisted', () => {
  const payload = {
    buildings: [
      { name: 'No id', x: 0, y: 0, width: 1, height: 1 },
      { id: 3, name: 'Valid', x: 0, y: 0, width: 1, height: 1, rooms: [{ name: 'roomless' }] },
    ],
  } as unknown as AtlasRawPayload;
  const normalized = normalizeAtlasPayload(payload);
  assert.equal(normalized.buildings.length, 1);
  assert.equal(normalized.buildings[0].atlasId, 3);
  assert.equal(normalized.buildings[0].rooms.length, 0);
});

// ── T2: content hash stability ────────────────────────────────────────

test('T2 hash: reordering payload does not change the hash', () => {
  const a = normalizeAtlasPayload(fixture);
  const shuffled: AtlasRawPayload = {
    buildings: [...fixture.buildings]
      .reverse()
      .map((b) => ({ ...b, rooms: [...(b.rooms ?? [])].reverse() })),
  };
  const b = normalizeAtlasPayload(shuffled);
  assert.equal(hashNormalizedMap(a), hashNormalizedMap(b));
});

test('T2b hash: a mirrored field change changes the hash', () => {
  const a = normalizeAtlasPayload(fixture);
  const mutated: AtlasRawPayload = JSON.parse(JSON.stringify(fixture));
  mutated.buildings[0].name = mutated.buildings[0].name + ' (renamed)';
  const b = normalizeAtlasPayload(mutated);
  assert.notEqual(hashNormalizedMap(a), hashNormalizedMap(b));
});

test('T2c hash: non-mirrored extra fields do not change the hash', () => {
  const a = normalizeAtlasPayload(fixture);
  const noisy: AtlasRawPayload = JSON.parse(JSON.stringify(fixture));
  (noisy.buildings[0] as any).somethingNew = 'ignore-me';
  (noisy.buildings[0] as any).createdAt = new Date().toISOString();
  const b = normalizeAtlasPayload(noisy);
  assert.equal(hashNormalizedMap(a), hashNormalizedMap(b));
});

// ── T3: diff classification ───────────────────────────────────────────

test('T3 diff: inserts, updates, deactivations and reactivations', () => {
  const existing = [
    { atlasId: 1, isActive: true },
    { atlasId: 2, isActive: true },
    { atlasId: 3, isActive: false },
    { atlasId: 4, isActive: true },
  ];

  const plan = diffAtlasCounts(existing, [1, 2, 3, 5]);
  assert.equal(plan.toInsert, 1); // 5
  assert.equal(plan.toUpdate, 3); // 1, 2, 3
  assert.equal(plan.reactivated, 1); // 3 was inactive
  assert.equal(plan.toDeactivate, 1); // 4 missing -> deactivate
});

test('T3b diff: empty existing -> all inserts; already-inactive missing rows stay inactive', () => {
  assert.deepEqual(diffAtlasCounts([], [10, 11]), {
    toInsert: 2,
    toUpdate: 0,
    toDeactivate: 0,
    reactivated: 0,
  });
  assert.deepEqual(diffAtlasCounts([{ atlasId: 9, isActive: false }], []), {
    toInsert: 0,
    toUpdate: 0,
    toDeactivate: 0,
    reactivated: 0,
  });
});

// ── T4: conditional fetch against a stub ATLAS ────────────────────────

function startStubAtlas(handler: (req: http.IncomingMessage, res: http.ServerResponse) => void) {
  return new Promise<{ url: string; close: () => Promise<void> }>((resolve) => {
    const server = http.createServer(handler);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      resolve({
        url: `http://127.0.0.1:${port}`,
        close: () => new Promise<void>((done) => server.close(() => done())),
      });
    });
  });
}

test('T4 conditional fetch: 200 then 304 with matching ETag', async () => {
  const body = JSON.stringify(fixture);
  const stub = await startStubAtlas((req, res) => {
    if (req.headers['if-none-match'] === 'W/"fixture-1"') {
      res.writeHead(304, { ETag: 'W/"fixture-1"' });
      res.end();
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json', ETag: 'W/"fixture-1"' });
    res.end(body);
  });

  try {
    const first = await fetchAtlasBuildings({ baseUrl: stub.url, schoolId: 1 });
    assert.equal(first.notModified, false);
    assert.equal(first.etag, 'W/"fixture-1"');
    assert.equal(first.payload?.buildings.length, 9);

    const second = await fetchAtlasBuildings({
      baseUrl: stub.url,
      schoolId: 1,
      etag: first.etag,
    });
    assert.equal(second.notModified, true);
    assert.equal(second.payload, undefined);
  } finally {
    await stub.close();
  }
});

test('T4b conditional fetch: HTTP error and malformed JSON raise typed errors', async () => {
  const failing = await startStubAtlas((_req, res) => {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end('{"error":"boom"}');
  });
  try {
    await assert.rejects(
      () => fetchAtlasBuildings({ baseUrl: failing.url, schoolId: 1 }),
      (err: unknown) => err instanceof AtlasFetchError
    );
  } finally {
    await failing.close();
  }

  const malformed = await startStubAtlas((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end('{"nope":true}');
  });
  try {
    await assert.rejects(
      () => fetchAtlasBuildings({ baseUrl: malformed.url, schoolId: 1 }),
      (err: unknown) => err instanceof AtlasFetchError && /malformed/.test((err as Error).message)
    );
  } finally {
    await malformed.close();
  }
});

// ── T5: campus image URL guard + download rules ───────────────────────

test('T5 image URL guard: same-origin /uploads only', () => {
  const base = 'http://100.88.55.125:5001/api/v1';

  const ok = resolveCampusImageUrl('/uploads/campus-1.png', base);
  assert.ok(ok);
  assert.equal(ok!.toString(), 'http://100.88.55.125:5001/uploads/campus-1.png');

  assert.equal(resolveCampusImageUrl('https://evil.example/x.png', base), null);
  assert.equal(resolveCampusImageUrl('http://127.0.0.1:9000/uploads/x.png', base), null);
  assert.equal(resolveCampusImageUrl('/etc/passwd', base), null);
  assert.equal(resolveCampusImageUrl('javascript:alert(1)', base), null);
  assert.equal(resolveCampusImageUrl(null, base), null);
  assert.equal(resolveCampusImageUrl('   ', base), null);
});

test('T5b image download: rejects non-image content type, accepts png', async () => {
  const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const stub = await startStubAtlas((req, res) => {
    if (req.url?.includes('html')) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<html></html>');
      return;
    }
    res.writeHead(200, { 'Content-Type': 'image/png' });
    res.end(pngBytes);
  });

  try {
    const ok = await downloadCampusImage(new URL(`${stub.url}/uploads/a.png`));
    assert.equal(ok.ext, 'png');
    assert.equal(ok.hash, hashBytes(pngBytes));

    await assert.rejects(
      () => downloadCampusImage(new URL(`${stub.url}/uploads/a.html`)),
      /Unsupported campus image/
    );
  } finally {
    await stub.close();
  }
});

test('T5c image sync: null mirrors removal (file deleted), unchanged hash skips rewrite', async () => {
  const assetsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-assets-'));
  try {
    const staleFile = path.join(assetsDir, 'campus-1.png');
    fs.writeFileSync(staleFile, Buffer.from('old'));

    const cleared = await syncCampusImage({
      schoolId: 1,
      rawUrl: null,
      previousPath: 'campus-1.png',
      previousHash: 'whatever',
      baseUrl: 'http://100.88.55.125:5001/api/v1',
      assetsDir,
    });
    assert.equal(cleared.changed, true);
    assert.equal(cleared.campusImagePath, null);
    assert.equal(fs.existsSync(staleFile), false, 'stale image file must be removed');

    const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    const stub = await startStubAtlas((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'image/png' });
      res.end(pngBytes);
    });
    try {
      const first = await syncCampusImage({
        schoolId: 1,
        rawUrl: '/uploads/campus.png',
        previousPath: null,
        previousHash: null,
        baseUrl: stub.url,
        fetchImpl: fetch,
        assetsDir,
      });
      assert.equal(first.changed, true);
      const stored = path.join(assetsDir, first.campusImagePath!);
      assert.ok(fs.existsSync(stored));

      const second = await syncCampusImage({
        schoolId: 1,
        rawUrl: '/uploads/campus.png',
        previousPath: first.campusImagePath,
        previousHash: first.campusImageHash,
        baseUrl: stub.url,
        fetchImpl: fetch,
        assetsDir,
      });
      assert.equal(second.changed, false, 'unchanged image must not rewrite the file');
      assert.equal(second.campusImageHash, first.campusImageHash);
    } finally {
      await stub.close();
    }
  } finally {
    fs.rmSync(assetsDir, { recursive: true, force: true });
  }
});

// ── Config ────────────────────────────────────────────────────────────

test('config: defaults + trailing slash normalization', () => {
  const defaults = getAtlasConfig();
  assert.equal(defaults.schoolId, 1);
  assert.ok(defaults.baseUrl.startsWith('http'));

  const custom = getAtlasConfig({ baseUrl: 'http://example.test:5001/api/v1///', schoolId: 4 });
  assert.equal(custom.baseUrl, 'http://example.test:5001/api/v1');
  assert.equal(custom.schoolId, 4);

  const invalid = getAtlasConfig({ schoolId: Number.NaN });
  assert.equal(invalid.schoolId, 1);
});
