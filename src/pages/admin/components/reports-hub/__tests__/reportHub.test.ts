import { describe, expect, it } from 'vitest';
import type { Report } from '../../../../../types';
import type { AssetCategoryPreset, PresetGroup } from '../../../../../hooks/useSystemPresets';
import {
  buildReportRows,
  classifyRecyclableMaterial,
  collectGradeLevels,
  filterLedgerRows,
  filterReportRows,
  filterWalkInRows,
  getAssetPillar,
  streamLabel,
  walkinFooter,
  wasteFooter,
} from '../reportHubRows';
import { buildAssetFolder, buildLedgerFolder, buildRecordsFolder, buildWasteFolder } from '../reportHubFolders';
import {
  filterLeaderboardRecords,
  filterPointRecords,
  filterStockRecords,
  leaderboardFooter,
  pointsFooter,
  stockFooter,
} from '../recordRows';
import { buildPrintUrl, parsePrintParams } from '../printUrl';
import { DEFAULT_HUB_FILTERS } from '../reportHubTypes';
import type {
  LeaderboardRecord,
  LedgerRow,
  PointRecord,
  StockRecord,
  WalkInRow,
} from '../reportHubTypes';
import { buildPrintJob } from '../../../../report-print/printModel';
import { pointLedgerPrintColumns, walkinPrintColumns, wastePrintColumns } from '../../../../report-print/printColumns';

const CATEGORIES: AssetCategoryPreset[] = [
  { id: 'cat-furn', name: 'Furniture', code: 'furniture', enabled: true },
  { id: 'cat-elec', name: 'Electronics', code: 'electronics', enabled: true },
  { id: 'cat-other', name: 'Other', code: 'other', enabled: true },
];

const GROUPS: PresetGroup[] = [
  {
    category: 'Furniture',
    categoryId: 'cat-furn',
    code: 'furniture',
    items: [
      { id: 'item-chair', name: 'Chair', enabled: true },
      { id: 'item-table', name: 'Table', enabled: true },
    ],
  },
  {
    category: 'Electronics',
    categoryId: 'cat-elec',
    code: 'electronics',
    items: [{ id: 'item-laptop', name: 'Laptop', enabled: true }],
  },
];

const taxonomy = { categories: CATEGORIES, groups: GROUPS };

function makeReport(overrides: Partial<Report>): Report {
  return {
    id: 'rep-1',
    title: 'Report',
    description: '',
    status: 'PENDING',
    urgency: 'MEDIUM',
    category: 'NON_BIODEGRADABLE',
    coordinates: { lat: 0, lng: 0 },
    locationName: 'Court',
    reporterId: 'user-1',
    reporterName: 'Juan',
    reporterRole: 'student',
    pointsAwarded: 0,
    timestamp: '2026-01-01T08:00:00.000Z',
    ...overrides,
  };
}

describe('classification helpers', () => {
  it('reads the asset pillar marker from the description', () => {
    expect(getAssetPillar('Broken chair [PILLAR: FURNITURE] near stage')).toBe('FURNITURE');
    expect(getAssetPillar('no marker here')).toBeNull();
  });

  it('classifies recyclable materials by keyword', () => {
    expect(classifyRecyclableMaterial('Scattered PET bottles')).toBe('pet_plastic');
    expect(classifyRecyclableMaterial('Aluminum cans pile')).toBe('aluminum_cans');
    expect(classifyRecyclableMaterial('Glass bottle shards')).toBe('glass');
    expect(classifyRecyclableMaterial('Cardboard boxes')).toBe('cardboard');
    expect(classifyRecyclableMaterial('Mixed junk')).toBe('mixed');
    // Word boundaries: "can" inside "canteen" must not read as cans.
    expect(classifyRecyclableMaterial('PET bottles by the canteen')).toBe('pet_plastic');
  });

  it('labels legacy streams as canonical names', () => {
    expect(streamLabel('ORGANIC')).toBe('Biodegradable');
    expect(streamLabel('GENERAL')).toBe('Non-Biodegradable');
    expect(streamLabel('RECYCLABLE')).toBe('Recyclable');
  });
});

describe('buildReportRows', () => {
  it('classifies asset reports by pillar and preset item', () => {
    const rows = buildReportRows(
      [
        makeReport({
          id: 'a1',
          reportType: 'ASSET',
          title: 'Broken chair in room 201',
          description: '[PILLAR: FURNITURE] leg snapped',
        }),
      ],
      taxonomy,
    );

    expect(rows[0].kind).toBe('ASSET');
    expect(rows[0].assetCategoryCode).toBe('furniture');
    expect(rows[0].assetItemName).toBe('Chair');
  });

  it('classifies recyclable waste reports by material', () => {
    const rows = buildReportRows(
      [makeReport({ category: 'RECYCLABLE', title: 'PET bottles near gate' })],
      taxonomy,
    );

    expect(rows[0].kind).toBe('WASTE');
    expect(rows[0].materialCode).toBe('pet_plastic');
    expect(rows[0].materialName).toBe('PET Bottles');
  });
});

describe('filters', () => {
  const rows = buildReportRows(
    [
      makeReport({ id: 'r1', timestamp: '2026-01-05T08:00:00.000Z', status: 'PENDING' }),
      makeReport({ id: 'r2', timestamp: '2026-02-10T08:00:00.000Z', status: 'COLLECTED', reporterName: 'Maria' }),
      makeReport({ id: 'r3', timestamp: '2026-03-15T08:00:00.000Z', status: 'EXPIRED' }),
    ],
    taxonomy,
  );

  it('applies the date range in order', () => {
    const filtered = filterReportRows(rows, { ...DEFAULT_HUB_FILTERS, from: '2026-02-01', to: '2026-02-28' });
    expect(filtered.map((row) => row.id)).toEqual(['r2']);
  });

  it('applies status and search filters', () => {
    const byStatus = filterReportRows(rows, { ...DEFAULT_HUB_FILTERS, statuses: ['PENDING', 'EXPIRED'] });
    expect(byStatus).toHaveLength(2);

    const byQuery = filterReportRows(rows, { ...DEFAULT_HUB_FILTERS, query: 'maria' });
    expect(byQuery.map((row) => row.id)).toEqual(['r2']);
  });

  it('filters by grade level and collects the available levels', () => {
    const graded = buildReportRows(
      [
        makeReport({ id: 'g1', reporterGradeLevel: 'Grade 8', reporterSection: 'Maka-Diyos' }),
        makeReport({ id: 'g2', reporterGradeLevel: 'Grade 9' }),
        makeReport({ id: 'g3' }),
      ],
      taxonomy,
    );

    expect(collectGradeLevels(graded)).toEqual(['Grade 8', 'Grade 9']);

    const filtered = filterReportRows(graded, { ...DEFAULT_HUB_FILTERS, gradeLevels: ['Grade 8'] });
    expect(filtered.map((row) => row.id)).toEqual(['g1']);
    expect(filtered[0].sectionName).toBe('Maka-Diyos');
  });
});

describe('folder builders', () => {
  it('counts waste folders per stream and material', () => {
    const rows = buildReportRows(
      [
        makeReport({ id: 'w1', category: 'BIODEGRADABLE' }),
        makeReport({ id: 'w2', category: 'RECYCLABLE', title: 'PET bottles' }),
        makeReport({ id: 'w3', category: 'RECYCLABLE', title: 'soda cans' }),
        makeReport({ id: 'w4', category: 'RECYCLABLE', title: 'random scraps' }),
      ],
      taxonomy,
    );

    const waste = buildWasteFolder(rows.filter((row) => row.kind === 'WASTE'));
    expect(waste.count).toBe(4);

    const recyclable = waste.children?.find((folder) => folder.name === 'Recyclable');
    expect(recyclable?.count).toBe(3);
    expect(recyclable?.children?.find((folder) => folder.name === 'PET Bottles')?.count).toBe(1);
    expect(recyclable?.children?.find((folder) => folder.name === 'Aluminum Cans')?.count).toBe(1);
    expect(recyclable?.children?.find((folder) => folder.name === 'Mixed Recyclables')?.count).toBe(1);
  });

  it('counts asset folders per category and item', () => {
    const rows = buildReportRows(
      [
        makeReport({ id: 'a1', reportType: 'ASSET', title: 'Broken laptop', description: '[PILLAR: ELECTRONICS]' }),
        makeReport({ id: 'a2', reportType: 'ASSET', title: 'Damaged thingamajig', description: '[PILLAR: FURNITURE]' }),
      ],
      taxonomy,
    );

    const asset = buildAssetFolder(rows.filter((row) => row.kind === 'ASSET'), taxonomy);
    expect(asset.count).toBe(2);

    const electronics = asset.children?.find((folder) => folder.name === 'Electronics');
    expect(electronics?.children?.find((folder) => folder.name === 'Laptop')?.count).toBe(1);

    const furniture = asset.children?.find((folder) => folder.name === 'Furniture');
    expect(furniture?.children?.find((folder) => folder.name === 'Other items')?.count).toBe(1);
  });

  it('groups ledger sales by material with canonical folders', () => {
    const sales: LedgerRow[] = [
      { id: 's1', date: '2026-01-01T00:00:00Z', kind: 'MARKET', materialCode: 'pet_plastic', materialName: 'PET Plastic Bottles', weightKg: 10, pricePerKg: 18, revenue: 180, buyerName: 'A' },
      { id: 's2', date: '2026-01-02T00:00:00Z', kind: 'MARKET', materialCode: 'pet_plastic', materialName: 'PET Plastic Bottles', weightKg: 5, pricePerKg: 18, revenue: 90, buyerName: 'A' },
      { id: 's3', date: '2026-01-03T00:00:00Z', kind: 'SCRAP', materialCode: 'e_waste', materialName: 'E-Waste (Electronics)', weightKg: 20, pricePerKg: 20, revenue: 400, buyerName: 'B' },
    ];

    const ledger = buildLedgerFolder(sales);
    expect(ledger.count).toBe(3);

    const recyclables = ledger.children?.find((folder) => folder.id === 'ledger:market');
    expect(recyclables?.count).toBe(2);
    expect(recyclables?.children?.find((folder) => folder.name === 'PET Bottles')?.count).toBe(2);

    const scrap = ledger.children?.find((folder) => folder.id === 'ledger:scrap');
    expect(scrap?.children?.find((folder) => folder.name === 'E-Waste (Electronics)')?.count).toBe(1);
  });
});

describe('ledger filters', () => {
  it('filters by buyer search and keeps newest first', () => {
    const sales: LedgerRow[] = [
      { id: 's1', date: '2026-01-01T00:00:00Z', kind: 'MARKET', materialCode: 'glass', materialName: 'Glass Bottles', weightKg: 3, pricePerKg: 15, revenue: 45, buyerName: 'Alpha' },
      { id: 's2', date: '2026-02-01T00:00:00Z', kind: 'MARKET', materialCode: 'glass', materialName: 'Glass Bottles', weightKg: 4, pricePerKg: 15, revenue: 60, buyerName: 'Beta' },
    ];

    const filtered = filterLedgerRows(sales, { ...DEFAULT_HUB_FILTERS, query: 'beta' });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('s2');
  });
});

const WALK_INS: WalkInRow[] = [
  {
    id: 'wi-1',
    date: '2026-02-10T06:00:00Z',
    studentName: 'Beatriz Del Rosario',
    gradeLevel: 'Grade 8',
    sectionName: 'Maka-Diyos',
    bottles: 12,
    ml: 6000,
    grams: 190,
    points: 6,
    recordedBy: 'MRF Staff',
  },
  {
    id: 'wi-2',
    date: '2026-01-05T06:00:00Z',
    studentName: 'Juan Dela Cruz',
    bottles: 4,
    ml: 2000,
    grams: 64,
    points: 2,
    recordedBy: 'MRF Staff',
  },
];

describe('walk-in bottles', () => {
  it('adds a Walk-in Bottles leaf to the ledger folder and counts it in the root', () => {
    const sales: LedgerRow[] = [
      { id: 's1', date: '2026-01-01T00:00:00Z', kind: 'MARKET', materialCode: 'glass', materialName: 'Glass Bottles', weightKg: 3, pricePerKg: 15, revenue: 45, buyerName: 'Alpha' },
    ];

    const ledger = buildLedgerFolder(sales, WALK_INS);
    expect(ledger.count).toBe(3);
    expect(ledger.latestAt).toBe('2026-02-10T06:00:00Z');

    const walkIn = ledger.children?.find((folder) => folder.id === 'ledger:walkin');
    expect(walkIn?.count).toBe(2);
    expect(walkIn?.print).toEqual({ section: 'walkin' });
  });

  it('filters walk-ins by date range and student search', () => {
    const byDate = filterWalkInRows(WALK_INS, { ...DEFAULT_HUB_FILTERS, from: '2026-02-01', to: '2026-02-28' });
    expect(byDate.map((row) => row.id)).toEqual(['wi-1']);

    const bySearch = filterWalkInRows(WALK_INS, { ...DEFAULT_HUB_FILTERS, query: 'juan' });
    expect(bySearch.map((row) => row.id)).toEqual(['wi-2']);
  });

  it('builds a walk-in PDF payload with bottle/volume/gram totals', () => {
    const rows = filterWalkInRows(WALK_INS, { ...DEFAULT_HUB_FILTERS, sort: 'oldest' });
    const job = buildPrintJob({
      target: { section: 'walkin' },
      filters: DEFAULT_HUB_FILTERS,
      yearLabel: '2026-2027',
      columns: walkinPrintColumns(),
      rows,
      footer: walkinFooter(rows),
      generatedAt: new Date('2026-10-13T19:22:00.000Z'),
    });

    expect(job.title).toBe('Walk-in Bottle Turnovers');
    expect(job.payload.rows[0][0]).toBe('Jan 05, 2026');
    expect(job.payload.rows[0][1]).toBe('Juan Dela Cruz');
    expect(job.payload.totals?.[1]).toBe('2 turnovers');
    expect(job.payload.totals?.[3]).toBe('16');
    expect(job.payload.totals?.[4]).toBe('8');
    expect(job.payload.totals?.[5]).toBe('254');
    expect(job.payload.totals?.[6]).toBe('8');
  });
});

describe('print URL round trip', () => {
  it('rebuilds the exact filters and target', () => {
    const filters = {
      ...DEFAULT_HUB_FILTERS,
      yearId: 'sy-1',
      from: '2026-01-01',
      to: '2026-06-30',
      statuses: ['PENDING', 'COLLECTED'],
      gradeLevels: ['Grade 8', 'Grade 9'],
      query: 'juan',
      sort: 'oldest' as const,
    };

    const url = buildPrintUrl({ section: 'waste', stream: 'RECYCLABLE', material: 'pet_plastic' }, filters);
    const parsed = parsePrintParams(url.slice(url.indexOf('?')));

    expect(parsed.target).toEqual({ section: 'waste', stream: 'RECYCLABLE', material: 'pet_plastic' });
    expect(parsed.filters).toEqual(filters);
  });

  it('keeps the walk-in section through the round trip', () => {
    const url = buildPrintUrl({ section: 'walkin' }, DEFAULT_HUB_FILTERS);
    const parsed = parsePrintParams(url.slice(url.indexOf('?')));
    expect(parsed.target.section).toBe('walkin');
  });
});

describe('PDF print job', () => {
  it('builds a payload that mirrors the on-screen table', () => {
    const rows = buildReportRows(
      [
        makeReport({
          id: 'p1',
          category: 'RECYCLABLE',
          title: 'PET bottles at gate',
          timestamp: '2026-01-03T08:00:00.000Z',
          weightCollected: 4.5,
          pointsAwarded: 15,
        }),
        makeReport({
          id: 'p2',
          category: 'RECYCLABLE',
          title: 'PET bottles by the canteen',
          timestamp: '2026-01-02T08:00:00.000Z',
        }),
        makeReport({ id: 'p3', category: 'BIODEGRADABLE', title: 'Leaves' }),
      ],
      taxonomy,
    );

    const materialRows = rows.filter((row) => row.materialCode === 'pet_plastic');
    const columns = wastePrintColumns();
    const job = buildPrintJob({
      target: { section: 'waste', stream: 'RECYCLABLE', material: 'pet_plastic' },
      filters: DEFAULT_HUB_FILTERS,
      yearLabel: '2026-2027',
      columns,
      rows: materialRows,
      footer: wasteFooter(materialRows),
      generatedAt: new Date('2026-10-13T19:22:00.000Z'),
    });

    expect(job.title).toBe('Waste Reports — Recyclable — PET Bottles');
    expect(job.fileName).toBe('waste-reports-recyclable-pet-bottles.pdf');
    expect(job.recordCount).toBe(2);
    expect(job.payload.columns.map((column) => column.header)).toEqual(columns.map((column) => column.header));
    expect(job.payload.rows[0][0]).toBe('Jan 03, 2026');
    expect(job.payload.rows[0][8]).toBe('4.5');
    expect(job.payload.rows[0][9]).toBe('15');
    // 0 kg / 0 points mean "no data" and print as an em-dash.
    expect(job.payload.rows[1][8]).toBe('—');
    expect(job.payload.rows[1][9]).toBe('—');
    expect(job.payload.totals?.[2]).toBe('2 reports');
    expect(job.payload.totals?.[8]).toBe('4.5');
    expect(job.payload.totals?.[9]).toBe('15');
    expect(job.payload.metaLines[0]).toBe('School Year: 2026-2027');
  });
});

const POINTS: PointRecord[] = [
  {
    id: 'pt-1',
    yearId: 'sy-1',
    yearLabel: '2025-2026',
    date: '2026-01-01T08:00:00Z',
    studentName: 'Juan Dela Cruz',
    gradeLevel: 'Grade 8',
    amount: 10,
    reason: 'Report verified',
  },
  {
    id: 'pt-2',
    yearId: 'sy-1',
    yearLabel: '2025-2026',
    date: '2026-02-01T08:00:00Z',
    studentName: 'Ana Reyes',
    gradeLevel: 'Grade 9',
    amount: -5,
    reason: 'False report deduction',
  },
];

const LEADERBOARD: LeaderboardRecord[] = [
  { id: 'lb-1', yearId: 'sy-1', yearLabel: '2025-2026', rank: 1, studentName: 'Ana Reyes', closingPoints: 120 },
  { id: 'lb-2', yearId: 'sy-1', yearLabel: '2025-2026', rank: 2, studentName: 'Juan Dela Cruz', closingPoints: 80 },
];

const STOCK: StockRecord[] = [
  { id: 'st-1', yearId: 'sy-1', yearLabel: '2025-2026', categoryName: 'PET Bottles', openingKg: 0, closingKg: 12 },
];

describe('year records', () => {
  it('builds the Year Records folder with points, leaderboard and stock leaves', () => {
    const folder = buildRecordsFolder(POINTS, LEADERBOARD, STOCK);
    expect(folder.section).toBe('RECORDS');
    expect(folder.count).toBe(5);
    expect(folder.latestAt).toBe('2026-02-01T08:00:00Z');
    expect(folder.children?.map((child) => child.print?.section)).toEqual(['points', 'leaderboard', 'stock']);
    expect(folder.children?.find((child) => child.id === 'records:points')?.count).toBe(2);
    expect(folder.children?.find((child) => child.id === 'records:leaderboard')?.count).toBe(2);
    expect(folder.children?.find((child) => child.id === 'records:stock')?.count).toBe(1);
  });

  it('filters points by date and search, and sorts deductions by amount', () => {
    const byDate = filterPointRecords(POINTS, { ...DEFAULT_HUB_FILTERS, from: '2026-01-15' });
    expect(byDate.map((row) => row.id)).toEqual(['pt-2']);

    const bySearch = filterPointRecords(POINTS, { ...DEFAULT_HUB_FILTERS, query: 'juan' });
    expect(bySearch.map((row) => row.id)).toEqual(['pt-1']);

    const byAmount = filterPointRecords(POINTS, { ...DEFAULT_HUB_FILTERS, sort: 'weight' });
    expect(byAmount.map((row) => row.id)).toEqual(['pt-1', 'pt-2']);
  });

  it('sorts leaderboard and stock rows by closing values when asked', () => {
    const board = filterLeaderboardRecords(LEADERBOARD, { ...DEFAULT_HUB_FILTERS, sort: 'weight' });
    expect(board.map((row) => row.id)).toEqual(['lb-1', 'lb-2']);

    const stock = filterStockRecords(STOCK, { ...DEFAULT_HUB_FILTERS, query: 'pet' });
    expect(stock.map((row) => row.id)).toEqual(['st-1']);
  });

  it('shapes totals for single-year and all-years views', () => {
    expect(pointsFooter(POINTS, false)).toEqual(['TOTAL', '2 entries', '', '5']);
    expect(pointsFooter(POINTS, true)).toEqual(['TOTAL', '2 entries', '', '5', '']);
    expect(leaderboardFooter(LEADERBOARD, false)).toEqual(['TOTAL', '2 students', '', '200']);
    expect(stockFooter(STOCK, false)).toEqual(['TOTAL', '—', '12', '12']);
  });

  it('builds a points-ledger PDF with a School Year column when showing all years', () => {
    const job = buildPrintJob({
      target: { section: 'points' },
      filters: { ...DEFAULT_HUB_FILTERS, yearId: 'ALL' },
      yearLabel: 'All school years',
      columns: pointLedgerPrintColumns(true),
      rows: POINTS,
      footer: pointsFooter(POINTS, true),
      generatedAt: new Date('2026-10-13T19:22:00.000Z'),
    });

    expect(job.title).toBe('Year Records — Points Ledger');
    expect(job.payload.columns.at(-1)?.header).toBe('School Year');
    expect(job.payload.rows[0].at(-1)).toBe('SY 2025-2026');
    expect(job.payload.totals).toEqual(['TOTAL', '2 entries', '', '5', '']);
  });
});
