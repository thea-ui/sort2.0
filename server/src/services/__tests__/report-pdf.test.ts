import test from 'node:test';
import assert from 'node:assert/strict';

import {
  generateReportPdf,
  normalizeReportPdfPayload,
  reportPdfFileName,
  ReportPdfError,
} from '../report-pdf.service.js';
import type { PublicBranding } from '../branding.service.js';

const BRANDING: PublicBranding = {
  schoolName: 'Enriquita Montilla De Esteban Memorial High School',
  schoolAcronym: 'EMEMHS',
  schoolId: null,
  division: null,
  region: 'REGION VI - WESTERN VISAYAS',
  address: null,
  schoolHeadName: null,
  primaryColor: '#00271D',
  secondaryColor: '#00A77C',
  accentColor: '#00A77C',
  goldColor: '#C69B26',
  logoUrl: null,
  currentSchoolYear: '2026-2027',
  currentTerm: null,
  enrollproPublicUrl: '',
  brandingSource: 'tenant',
};

function basePayload(overrides: Record<string, unknown> = {}) {
  return {
    title: 'Waste Reports — Recyclable — PET Bottles',
    metaLines: ['School Year: 2026-2027', 'Statuses: Pending, Collected'],
    recordCount: 2,
    generatedLabel: 'Oct 13, 2026 · 7:22 PM',
    columns: [
      { header: 'Date', width: 8 },
      { header: 'Report ID', width: 9, small: true },
      { header: 'Title', width: 20 },
      { header: 'Weight (kg)', width: 7, align: 'right' },
    ],
    rows: [
      ['Sep 29, 2026', '17f4e00b-aba8-4d4a-9a8a-cd71341d41ee', 'Scattered PET bottles at the library wing and adjacent corridors', '5.6'],
      ['Sep 22, 2026', 'fb3c2b79-0028-4ea3-be4d-9c1f953e1f62', 'PET bottles', '2'],
    ],
    totals: ['TOTAL', '', '2 reports', '7.6'],
    ...overrides,
  };
}

test('normalizeReportPdfPayload validates and caps untrusted input', () => {
  const payload = normalizeReportPdfPayload(basePayload());
  assert.equal(payload.title, 'Waste Reports — Recyclable — PET Bottles');
  assert.equal(payload.columns.length, 4);
  assert.equal(payload.rows.length, 2);
  assert.equal(payload.rows[0].length, 4);
  assert.equal(payload.recordCount, 2);

  // Short rows are padded so every row matches the column count.
  const padded = normalizeReportPdfPayload(basePayload({ rows: [['x']] }));
  assert.equal(padded.rows[0].length, 4);
  assert.equal(padded.rows[0][3], '');

  assert.throws(() => normalizeReportPdfPayload(null), ReportPdfError);
  assert.throws(() => normalizeReportPdfPayload(basePayload({ columns: [] })), ReportPdfError);
  assert.throws(
    () => normalizeReportPdfPayload(basePayload({ rows: Array.from({ length: 3001 }, () => ['x']) })),
    ReportPdfError,
  );
});

test('reportPdfFileName slugs the report title', () => {
  assert.equal(
    reportPdfFileName('Waste Reports — Recyclable — PET Bottles'),
    'waste-reports-recyclable-pet-bottles.pdf',
  );
  assert.equal(reportPdfFileName('!!!'), 'report.pdf');
});

test('generateReportPdf renders a valid PDF buffer with branding override', async () => {
  const buffer = await generateReportPdf(normalizeReportPdfPayload(basePayload()), BRANDING);
  assert.ok(buffer.length > 1000, 'expected a non-trivial PDF buffer');
  assert.equal(buffer.subarray(0, 5).toString('latin1'), '%PDF-');
});

test('generateReportPdf renders an empty report without crashing', async () => {
  const empty = normalizeReportPdfPayload(basePayload({ rows: [], totals: undefined, recordCount: 0 }));
  const buffer = await generateReportPdf(empty, BRANDING);
  assert.equal(buffer.subarray(0, 5).toString('latin1'), '%PDF-');
});
