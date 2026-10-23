import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  MAX_REPORT_PHOTO_BYTES,
  ReportPhotoError,
  deleteReportPhoto,
  parseImageDataUrl,
  reportPhotoContentType,
  resolveReportPhotoFile,
  storeReportPhoto,
} from '../report-photo-storage.js';

const ONE_PX_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

test('parseImageDataUrl accepts JPEG/PNG/WebP and rejects everything else', () => {
  const parsed = parseImageDataUrl(ONE_PX_PNG);
  assert.equal(parsed.mime, 'image/png');
  assert.equal(parsed.ext, 'png');
  assert.ok(parsed.buffer.length > 0);

  assert.throws(() => parseImageDataUrl('https://example.test/photo.png'), ReportPhotoError);
  assert.throws(() => parseImageDataUrl('data:image/gif;base64,R0lGODlhAQABAAAAACw='), ReportPhotoError);
  assert.throws(() => parseImageDataUrl('data:text/plain;base64,aGVsbG8='), ReportPhotoError);
});

test('parseImageDataUrl enforces the photo size cap', () => {
  const huge = 'A'.repeat(Math.ceil((MAX_REPORT_PHOTO_BYTES + 1024) / 3) * 4);
  assert.throws(
    () => parseImageDataUrl(`data:image/png;base64,${huge}`),
    (error: unknown) => error instanceof ReportPhotoError && error.status === 413
  );
});

test('storeReportPhoto writes a file and resolves it back', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'sort-photo-test-'));
  try {
    const { photoPath, bytes } = storeReportPhoto('report-1', ONE_PX_PNG, dir);
    assert.equal(photoPath, 'reports/report-1.png');
    assert.ok(bytes > 0);

    const absolute = resolveReportPhotoFile(photoPath, dir);
    assert.ok(absolute && existsSync(absolute));
    assert.equal(reportPhotoContentType(absolute!), 'image/png');

    deleteReportPhoto(photoPath, dir);
    assert.equal(resolveReportPhotoFile(photoPath, dir), null);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('resolveReportPhotoFile rejects traversal and foreign prefixes', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'sort-photo-test-'));
  try {
    assert.equal(resolveReportPhotoFile('reports/../../etc/passwd', dir), null);
    assert.equal(resolveReportPhotoFile('reports/..%2fsecret.png', dir), null);
    assert.equal(resolveReportPhotoFile('other/photo.png', dir), null);
    assert.equal(resolveReportPhotoFile('reports/missing.png', dir), null);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
