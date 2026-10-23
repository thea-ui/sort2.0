import type {
  LeaderboardRecord,
  LedgerRow,
  PointRecord,
  ReportHubRow,
  StockRecord,
  WalkInRow,
} from '../admin/components/reports-hub/reportHubTypes';
import { streamLabel } from '../admin/components/reports-hub/reportHubRows';
import { formatLongDate } from '../../utils/dateFormat';
import type { PrintColumn } from './ReportPrintTable';

const num = (value: number) => value.toLocaleString('en-PH', { maximumFractionDigits: 2 });
/** Display rule: 0 = no data, shown as an em-dash (CSV keeps the raw 0). */
const numOrDash = (value: number) => (value > 0 ? num(value) : '—');
const pointsOrDash = (value: number) => (value > 0 ? String(value) : '—');
const peso = (value: number) =>
  `₱${value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const titleCase = (value: string) => value.charAt(0) + value.slice(1).toLowerCase();

/** Reporter text: staff show their role, students show grade level · section. */
const reporterText = (row: ReportHubRow) => {
  const meta =
    row.reporterMeta ?? ([row.gradeLevel, row.sectionName].filter(Boolean).join(' · ') || undefined);
  return meta ? `${row.reporterName} (${meta})` : row.reporterName;
};

const REPORT_ID_COLUMN_WIDTH = 9;

export function wastePrintColumns(): PrintColumn<ReportHubRow>[] {
  return [
    {
      header: 'Date',
      cell: (row) => formatLongDate(row.date),
      csv: (row) => formatLongDate(row.date),
      className: 'whitespace-nowrap',
      pdf: { width: 8 },
    },
    {
      header: 'Report ID',
      cell: (row) => <span className="font-mono text-[10px]">{row.id}</span>,
      csv: (row) => row.id,
      pdf: { width: REPORT_ID_COLUMN_WIDTH, small: true },
    },
    {
      header: 'Title',
      cell: (row) => <span className="font-semibold">{row.title}</span>,
      csv: (row) => row.title,
      className: 'min-w-[150px]',
      pdf: { width: 20 },
    },
    {
      header: 'Stream',
      cell: (row) => [streamLabel(row.stream), row.materialName].filter(Boolean).join(' · '),
      csv: (row) => [streamLabel(row.stream), row.materialName].filter(Boolean).join(' · '),
      pdf: { width: 11 },
    },
    {
      header: 'Location',
      cell: (row) => row.locationName,
      csv: (row) => row.locationName,
      pdf: { width: 13 },
    },
    {
      header: 'Reporter',
      cell: reporterText,
      csv: reporterText,
      pdf: { width: 13 },
    },
    { header: 'Status', cell: (row) => titleCase(row.status), csv: (row) => titleCase(row.status), pdf: { width: 8 } },
    { header: 'Urgency', cell: (row) => titleCase(row.urgency), csv: (row) => titleCase(row.urgency), pdf: { width: 8 } },
    {
      header: 'Weight (kg)',
      align: 'right',
      cell: (row) => numOrDash(row.weightKg),
      csv: (row) => row.weightKg,
      pdfValue: (row) => numOrDash(row.weightKg),
      pdf: { width: 7 },
    },
    {
      header: 'Points',
      align: 'right',
      cell: (row) => pointsOrDash(row.points),
      csv: (row) => row.points,
      pdfValue: (row) => pointsOrDash(row.points),
      pdf: { width: 6 },
    },
  ];
}

export function assetPrintColumns(): PrintColumn<ReportHubRow>[] {
  return [
    {
      header: 'Date',
      cell: (row) => formatLongDate(row.date),
      csv: (row) => formatLongDate(row.date),
      className: 'whitespace-nowrap',
      pdf: { width: 8 },
    },
    {
      header: 'Report ID',
      cell: (row) => <span className="font-mono text-[10px]">{row.id}</span>,
      csv: (row) => row.id,
      pdf: { width: REPORT_ID_COLUMN_WIDTH, small: true },
    },
    {
      header: 'Item',
      cell: (row) => <span className="font-semibold">{row.assetItemName ?? 'Unspecified'}</span>,
      csv: (row) => row.assetItemName ?? 'Unspecified',
      pdf: { width: 13 },
    },
    {
      header: 'Category',
      cell: (row) => row.assetCategoryName ?? 'Other',
      csv: (row) => row.assetCategoryName ?? 'Other',
      pdf: { width: 10 },
    },
    {
      header: 'Issue',
      cell: (row) => row.title,
      csv: (row) => row.title,
      className: 'min-w-[150px]',
      pdf: { width: 22 },
    },
    { header: 'Location', cell: (row) => row.locationName, csv: (row) => row.locationName, pdf: { width: 16 } },
    { header: 'Reporter', cell: reporterText, csv: reporterText, pdf: { width: 14 } },
    { header: 'Status', cell: (row) => titleCase(row.status), csv: (row) => titleCase(row.status), pdf: { width: 8 } },
  ];
}

export function ledgerPrintColumns(): PrintColumn<LedgerRow>[] {
  return [
    {
      header: 'Date',
      cell: (row) => formatLongDate(row.date),
      csv: (row) => formatLongDate(row.date),
      className: 'whitespace-nowrap',
      pdf: { width: 9 },
    },
    {
      header: 'Material',
      cell: (row) => <span className="font-semibold">{row.materialName}</span>,
      csv: (row) => row.materialName,
      className: 'min-w-[150px]',
      pdf: { width: 24 },
    },
    {
      header: 'Weight (kg)',
      align: 'right',
      cell: (row) => numOrDash(row.weightKg),
      csv: (row) => row.weightKg,
      pdfValue: (row) => numOrDash(row.weightKg),
      pdf: { width: 10 },
    },
    { header: 'Price per kg', align: 'right', cell: (row) => peso(row.pricePerKg), csv: (row) => row.pricePerKg, pdf: { width: 11 } },
    { header: 'Revenue', align: 'right', cell: (row) => peso(row.revenue), csv: (row) => row.revenue, pdf: { width: 11 } },
    { header: 'Buyer', cell: (row) => row.buyerName || '—', csv: (row) => row.buyerName, pdf: { width: 25 } },
  ];
}

/** Grade/Section label shared by the walk-in table cells and the PDF. */
const gradeSection = (row: WalkInRow) =>
  [row.gradeLevel, row.sectionName].filter(Boolean).join(' · ') || '—';

export function walkinPrintColumns(): PrintColumn<WalkInRow>[] {
  return [
    {
      header: 'Date',
      cell: (row) => formatLongDate(row.date),
      csv: (row) => formatLongDate(row.date),
      className: 'whitespace-nowrap',
      pdf: { width: 9 },
    },
    {
      header: 'Student',
      cell: (row) => <span className="font-semibold">{row.studentName}</span>,
      csv: (row) => row.studentName,
      className: 'min-w-[150px]',
      pdf: { width: 20 },
    },
    { header: 'Grade / Section', cell: gradeSection, csv: gradeSection, pdf: { width: 13 } },
    { header: 'Bottles', align: 'right', cell: (row) => row.bottles, csv: (row) => row.bottles, pdf: { width: 8 } },
    {
      header: 'Volume (L)',
      align: 'right',
      cell: (row) => num(row.ml / 1000),
      csv: (row) => row.ml / 1000,
      pdf: { width: 9 },
    },
    { header: 'Weight (g)', align: 'right', cell: (row) => num(row.grams), csv: (row) => row.grams, pdf: { width: 9 } },
    { header: 'Points', align: 'right', cell: (row) => row.points, csv: (row) => row.points, pdf: { width: 7 } },
    {
      header: 'Recorded by',
      cell: (row) => row.recordedBy || '—',
      csv: (row) => row.recordedBy,
      pdf: { width: 15 },
    },
  ];
}

// ── Year records (points ledger, leaderboard, market stock snapshots) ──

const yearPrintColumn = <T extends { yearLabel: string }>(): PrintColumn<T> => ({
  header: 'School Year',
  cell: (row) => `SY ${row.yearLabel}`,
  csv: (row) => row.yearLabel,
  pdfValue: (row) => `SY ${row.yearLabel}`,
  pdf: { width: 10 },
});

const signed = (value: number) => (value > 0 ? `+${num(value)}` : num(value));

export function pointLedgerPrintColumns(showYear = false): PrintColumn<PointRecord>[] {
  const columns: PrintColumn<PointRecord>[] = [
    {
      header: 'Date',
      cell: (row) => formatLongDate(row.date),
      csv: (row) => formatLongDate(row.date),
      className: 'whitespace-nowrap',
      pdf: { width: 10 },
    },
    {
      header: 'Student',
      cell: (row) => <span className="font-semibold">{row.studentName}</span>,
      csv: (row) => row.studentName,
      className: 'min-w-[150px]',
      pdf: { width: 20 },
    },
    {
      header: 'Reason',
      cell: (row) => row.reason || '—',
      csv: (row) => row.reason,
      className: 'min-w-[200px]',
      pdf: { width: 32 },
    },
    {
      header: 'Amount',
      align: 'right',
      cell: (row) => signed(row.amount),
      csv: (row) => row.amount,
      pdfValue: (row) => signed(row.amount),
      pdf: { width: 9 },
    },
  ];
  if (showYear) columns.push(yearPrintColumn<PointRecord>());
  return columns;
}

export function leaderboardPrintColumns(showYear = false): PrintColumn<LeaderboardRecord>[] {
  const gradeSection = (row: LeaderboardRecord) =>
    [row.gradeLevel, row.sectionName].filter(Boolean).join(' · ') || '—';
  const columns: PrintColumn<LeaderboardRecord>[] = [
    { header: 'Rank', cell: (row) => row.rank, csv: (row) => row.rank, pdf: { width: 7 } },
    {
      header: 'Student',
      cell: (row) => <span className="font-semibold">{row.studentName}</span>,
      csv: (row) => row.studentName,
      className: 'min-w-[150px]',
      pdf: { width: 24 },
    },
    { header: 'Grade / Section', cell: gradeSection, csv: gradeSection, pdf: { width: 16 } },
    {
      header: 'Closing Points',
      align: 'right',
      cell: (row) => num(row.closingPoints),
      csv: (row) => row.closingPoints,
      pdf: { width: 12 },
    },
  ];
  if (showYear) columns.push(yearPrintColumn<LeaderboardRecord>());
  return columns;
}

export function stockPrintColumns(showYear = false): PrintColumn<StockRecord>[] {
  const columns: PrintColumn<StockRecord>[] = [
    {
      header: 'Category',
      cell: (row) => <span className="font-semibold">{row.categoryName}</span>,
      csv: (row) => row.categoryName,
      className: 'min-w-[150px]',
      pdf: { width: 26 },
    },
    { header: 'Opening (kg)', align: 'right', cell: (row) => num(row.openingKg), csv: (row) => row.openingKg, pdf: { width: 12 } },
    { header: 'Closing (kg)', align: 'right', cell: (row) => num(row.closingKg), csv: (row) => row.closingKg, pdf: { width: 12 } },
    {
      header: 'Net (kg)',
      align: 'right',
      cell: (row) => num(row.closingKg - row.openingKg),
      csv: (row) => row.closingKg - row.openingKg,
      pdf: { width: 11 },
    },
  ];
  if (showYear) columns.push(yearPrintColumn<StockRecord>());
  return columns;
}
