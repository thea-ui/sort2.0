import type { Report } from '../../../../types';
import type { AssetCategoryPreset, PresetGroup } from '../../../../hooks/useSystemPresets';
import { isAssetReport } from '../../../../utils/reportQueueUtils';
import { toDateKey } from '../../../../utils/dateFormat';
import type { LedgerRow, PrintTarget, ReportHubFilters, ReportHubRow, WalkInRow } from './reportHubTypes';

// ── Taxonomy constants ─────────────────────────────────────────────────

export interface MaterialRef {
  code: string;
  name: string;
}

/** Recyclable stream materials — mirror the Recycle Market categories. */
export const RECYCLABLE_MATERIALS: MaterialRef[] = [
  { code: 'pet_plastic', name: 'PET Bottles' },
  { code: 'aluminum_cans', name: 'Aluminum Cans' },
  { code: 'cardboard', name: 'Cardboard & Paper' },
  { code: 'glass', name: 'Glass Bottles' },
];

export const MIXED_RECYCLABLE: MaterialRef = { code: 'mixed', name: 'Mixed Recyclables' };

/** Asset scrap materials — mirror the MRF asset-scrap stock defaults. */
export const SCRAP_MATERIALS: MaterialRef[] = [
  { code: 'ferrous_metal', name: 'Ferrous Metal (Steel / Iron)' },
  { code: 'non_ferrous_metal', name: 'Non-Ferrous Metal (Aluminum / Copper)' },
  { code: 'e_waste', name: 'E-Waste (Electronics)' },
  { code: 'plastic', name: 'Hard Plastic' },
  { code: 'wood', name: 'Wood / Lumber' },
  { code: 'glass', name: 'Glass' },
  { code: 'mixed', name: 'Mixed / Other Scrap' },
];

export const OTHER_ITEM_KEY = '__other__';

/** Legacy stream aliases collapse onto the three canonical streams. */
export function normalizeStream(category: string): string {
  if (category === 'ORGANIC') return 'BIODEGRADABLE';
  if (category === 'GENERAL') return 'NON_BIODEGRADABLE';
  return category;
}

/** Fallback stream labels for the hub (identity → archives). */
export function streamLabel(category?: string): string {
  if (category === 'RECYCLABLE') return 'Recyclable';
  if (category === 'BIODEGRADABLE' || category === 'ORGANIC') return 'Biodegradable';
  return 'Non-Biodegradable';
}

// ── Classification ─────────────────────────────────────────────────────

function normalizeKey(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

const PILLAR_PATTERN = /\[PILLAR:\s*([A-Z_ ]+)\]/i;

/** Asset reports embed their pillar marker in the description text. */
export function getAssetPillar(description?: string): string | null {
  if (!description) return null;
  const match = description.match(PILLAR_PATTERN);
  return match ? match[1].trim().toUpperCase() : null;
}

/** Keyword fallback until reports store their recyclable material explicitly. */
export function classifyRecyclableMaterial(text: string): string {
  const value = text.toLowerCase();
  if (/\bglass\b/.test(value)) return 'glass';
  if (/\bcardboard\b|\bpaper\b|\bcarton\b|\bbox(es)?\b/.test(value)) return 'cardboard';
  if (/\bcans?\b|\bmetal\b|\balumin(um|ium)?\b|\btin\b/.test(value)) return 'aluminum_cans';
  if (/\bbottles?\b|\bpet\b|\bplastic\b/.test(value)) return 'pet_plastic';
  return 'mixed';
}

export interface AssetTaxonomy {
  categories: AssetCategoryPreset[];
  groups: PresetGroup[];
}

interface AssetClassification {
  categoryCode: string;
  categoryName: string;
  itemName: string | null;
}

function matchCategory(
  taxonomy: AssetTaxonomy,
  pillar: string | null,
): AssetCategoryPreset | null {
  if (!pillar) return null;
  const target = normalizeKey(pillar);
  return (
    taxonomy.categories.find((cat) => normalizeKey(cat.code) === target) ??
    taxonomy.categories.find((cat) => normalizeKey(cat.name) === target) ??
    taxonomy.categories.find((cat) => normalizeKey(cat.name).includes(target) || target.includes(normalizeKey(cat.name))) ??
    null
  );
}

function findItemMatch(text: string, items: { name: string; enabled: boolean }[]): string | null {
  const haystack = text.toUpperCase();
  let best: string | null = null;
  for (const item of items) {
    if (!item.enabled) continue;
    const needle = item.name.toUpperCase().trim();
    if (needle.length < 3) continue;
    if (haystack.includes(needle) && (!best || item.name.length > best.length)) {
      best = item.name;
    }
  }
  return best;
}

function classifyAsset(report: Report, taxonomy: AssetTaxonomy): AssetClassification {
  const text = `${report.title} ${report.description}`;
  const pillar = getAssetPillar(report.description);

  let category = matchCategory(taxonomy, pillar);
  let itemName: string | null = null;

  if (category) {
    const group = taxonomy.groups.find((g) => g.categoryId === category!.id || g.category === category!.name);
    if (group) itemName = findItemMatch(text, group.items);
  } else {
    // No pillar (or an unknown one): try to infer the category from item names.
    for (const group of taxonomy.groups) {
      const match = findItemMatch(text, group.items);
      if (match) {
        itemName = match;
        category =
          taxonomy.categories.find((cat) => cat.id === group.categoryId || cat.name === group.category) ?? null;
        break;
      }
    }
  }

  const fallback =
    taxonomy.categories.find((cat) => normalizeKey(cat.code) === 'OTHER' || normalizeKey(cat.name) === 'OTHER') ??
    null;

  return {
    categoryCode: (category ?? fallback)?.code ?? 'other',
    categoryName: (category ?? fallback)?.name ?? 'Other',
    itemName,
  };
}

// ── Row building ───────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  teacher: 'Teacher',
  admin: 'Admin',
  mrf: 'MRF',
};

export function buildReportRows(reports: Report[], taxonomy: AssetTaxonomy): ReportHubRow[] {
  return reports.map((report) => {
    const date = report.timestamp || report.completedAt || '';
    const base = {
      id: report.id,
      date,
      title: report.title || 'Untitled report',
      reporterName: report.reporterName || 'Unknown',
      reporterMeta: report.reporterRole ? ROLE_LABELS[report.reporterRole] : undefined,
      gradeLevel: report.reporterGradeLevel ?? undefined,
      sectionName: report.reporterSection ?? undefined,
      locationName: report.locationName || 'Campus Location',
      status: report.status,
      urgency: report.urgency,
      weightKg: report.weightCollected ?? 0,
      points: report.pointsAwarded ?? 0,
    };

    if (isAssetReport(report)) {
      const asset = classifyAsset(report, taxonomy);
      return {
        ...base,
        kind: 'ASSET' as const,
        stream: report.category,
        assetCategoryCode: asset.categoryCode,
        assetCategoryName: asset.categoryName,
        assetItemName: asset.itemName ?? undefined,
      };
    }

    const materialCode =
      report.category === 'RECYCLABLE' ? classifyRecyclableMaterial(`${report.title} ${report.description}`) : undefined;
    const materialName = materialCode
      ? (RECYCLABLE_MATERIALS.find((m) => m.code === materialCode) ?? MIXED_RECYCLABLE).name
      : undefined;

    return {
      ...base,
      kind: 'WASTE' as const,
      stream: report.category,
      materialCode,
      materialName,
    };
  });
}

// ── Filtering & sorting ────────────────────────────────────────────────

function withinRange(date: string, from: string, to: string): boolean {
  const key = toDateKey(date);
  if (!key) return true;
  if (from && key < from) return false;
  if (to && key > to) return false;
  return true;
}

function matchesQuery(parts: (string | undefined)[], query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return parts.some((part) => (part ?? '').toLowerCase().includes(q));
}

export function filterReportRows(rows: ReportHubRow[], filters: ReportHubFilters): ReportHubRow[] {
  const filtered = rows.filter((row) => {
    if (!withinRange(row.date, filters.from, filters.to)) return false;
    if (filters.statuses.length > 0 && !filters.statuses.includes(row.status)) return false;
    if (filters.gradeLevels.length > 0 && !filters.gradeLevels.includes(row.gradeLevel ?? '')) return false;
    return matchesQuery(
      [
        row.title,
        row.id,
        row.reporterName,
        row.locationName,
        row.materialName,
        row.assetCategoryName,
        row.assetItemName,
      ],
      filters.query,
    );
  });

  return sortReportRows(filtered, filters.sort);
}

/** Distinct grade levels present in the rows, for the hub's grade filter. */
export function collectGradeLevels(rows: ReportHubRow[]): string[] {
  const levels = new Set<string>();
  for (const row of rows) {
    if (row.gradeLevel?.trim()) levels.add(row.gradeLevel);
  }
  return [...levels].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

export function sortReportRows(rows: ReportHubRow[], sort: ReportHubFilters['sort']): ReportHubRow[] {
  const sorted = [...rows];
  switch (sort) {
    case 'oldest':
      sorted.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      break;
    case 'title':
      sorted.sort((a, b) => a.title.localeCompare(b.title));
      break;
    case 'weight':
      sorted.sort((a, b) => b.weightKg - a.weightKg);
      break;
    default:
      sorted.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
  return sorted;
}

export function filterLedgerRows(rows: LedgerRow[], filters: ReportHubFilters): LedgerRow[] {
  const filtered = rows.filter((row) => {
    if (!withinRange(row.date, filters.from, filters.to)) return false;
    return matchesQuery([row.materialName, row.buyerName], filters.query);
  });
  const sorted = [...filtered];
  if (filters.sort === 'oldest') {
    sorted.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  } else if (filters.sort === 'title') {
    sorted.sort((a, b) => a.materialName.localeCompare(b.materialName));
  } else if (filters.sort === 'weight') {
    sorted.sort((a, b) => b.weightKg - a.weightKg);
  } else {
    sorted.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
  return sorted;
}

// ── Summaries ──────────────────────────────────────────────────────────

export function summarizeReportRows(rows: ReportHubRow[]) {
  return {
    count: rows.length,
    weightKg: rows.reduce((sum, row) => sum + row.weightKg, 0),
    points: rows.reduce((sum, row) => sum + row.points, 0),
  };
}

export function summarizeLedgerRows(rows: LedgerRow[]) {
  return {
    count: rows.length,
    weightKg: rows.reduce((sum, row) => sum + row.weightKg, 0),
    revenue: rows.reduce((sum, row) => sum + row.revenue, 0),
  };
}

// ── Leaf targeting (shared by the hub folders and the print/PDF export) ─

export function narrowReportRows(rows: ReportHubRow[], target: PrintTarget): ReportHubRow[] {
  if (target.section === 'waste') {
    return rows.filter(
      (row) =>
        row.kind === 'WASTE' &&
        (!target.stream || normalizeStream(row.stream) === target.stream) &&
        (!target.material || row.materialCode === target.material),
    );
  }
  if (target.section === 'asset') {
    return rows.filter(
      (row) =>
        row.kind === 'ASSET' &&
        (!target.categoryCode || normalizeKey(row.assetCategoryCode ?? 'other') === normalizeKey(target.categoryCode)) &&
        (!target.itemName ||
          (target.itemName === OTHER_ITEM_KEY ? !row.assetItemName : row.assetItemName === target.itemName)),
    );
  }
  return [];
}

export function narrowLedgerRows(rows: LedgerRow[], target: PrintTarget): LedgerRow[] {
  const kind = target.section === 'ledger-scrap' ? 'SCRAP' : 'MARKET';
  return rows.filter((row) => row.kind === kind && (!target.material || row.materialCode === target.material));
}

export function filterWalkInRows(rows: WalkInRow[], filters: ReportHubFilters): WalkInRow[] {
  const filtered = rows.filter((row) => {
    if (!withinRange(row.date, filters.from, filters.to)) return false;
    return matchesQuery([row.studentName, row.gradeLevel, row.sectionName, row.recordedBy], filters.query);
  });
  const sorted = [...filtered];
  if (filters.sort === 'oldest') {
    sorted.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  } else if (filters.sort === 'title') {
    sorted.sort((a, b) => a.studentName.localeCompare(b.studentName));
  } else if (filters.sort === 'weight') {
    sorted.sort((a, b) => b.grams - a.grams);
  } else {
    sorted.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
  return sorted;
}

export function summarizeWalkInRows(rows: WalkInRow[]) {
  return {
    count: rows.length,
    bottles: rows.reduce((sum, row) => sum + row.bottles, 0),
    ml: rows.reduce((sum, row) => sum + row.ml, 0),
    grams: rows.reduce((sum, row) => sum + row.grams, 0),
    points: rows.reduce((sum, row) => sum + row.points, 0),
  };
}

// Totals-cell formatting: 0 means "no data" and prints as an em-dash.
const fmtNum = (value: number) => (value > 0 ? value.toLocaleString('en-PH', { maximumFractionDigits: 2 }) : '—');
const fmtNumOrZero = (value: number) => value.toLocaleString('en-PH', { maximumFractionDigits: 2 });
const fmtPeso = (value: number) =>
  `₱${value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Totals row aligned to the waste-report print columns. */
export function wasteFooter(rows: ReportHubRow[]): (string | number)[] {
  const totals = summarizeReportRows(rows);
  return [
    'TOTAL',
    '',
    `${totals.count} ${totals.count === 1 ? 'report' : 'reports'}`,
    '',
    '',
    '',
    '',
    '',
    fmtNum(totals.weightKg),
    fmtNum(totals.points),
  ];
}

/** Totals row aligned to the asset-report print columns. */
export function assetFooter(rows: ReportHubRow[]): (string | number)[] {
  const totals = summarizeReportRows(rows);
  return [
    'TOTAL',
    '',
    '',
    '',
    `${totals.count} ${totals.count === 1 ? 'report' : 'reports'}`,
    '',
    '',
    '',
  ];
}

/** Totals row aligned to the ledger print columns. */
export function ledgerFooter(rows: LedgerRow[]): (string | number)[] {
  const totals = summarizeLedgerRows(rows);
  return [
    'TOTAL',
    `${totals.count} ${totals.count === 1 ? 'sale' : 'sales'}`,
    fmtNumOrZero(totals.weightKg),
    '',
    fmtPeso(totals.revenue),
    '',
  ];
}

/** Totals row aligned to the walk-in bottles print columns. */
export function walkinFooter(rows: WalkInRow[]): (string | number)[] {
  const totals = summarizeWalkInRows(rows);
  return [
    'TOTAL',
    `${totals.count} ${totals.count === 1 ? 'turnover' : 'turnovers'}`,
    '',
    fmtNumOrZero(totals.bottles),
    fmtNumOrZero(totals.ml / 1000),
    fmtNumOrZero(totals.grams),
    fmtNumOrZero(totals.points),
    '',
  ];
}
