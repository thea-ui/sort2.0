import React from 'react';
import { ChevronRight } from 'lucide-react';
import type { TableColumn } from '../../../../components/data-table';
import { formatLongDate } from '../../../../utils/dateFormat';
import type { LeaderboardRecord, LedgerRow, PointRecord, ReportHubRow, StockRecord, WalkInRow } from './reportHubTypes';
import { LedgerStatusBadge } from './LedgerStatusBadge';
import { num, peso } from './ledgerFormatters';

/**
 * Admin hub tables show only the fields that matter for scanning/filtering;
 * the removed details (report ID, stream, urgency, weight, points…) live in
 * the row's View pop-up and in the downloaded PDF.
 */

const dateValue = (row: { date: string }) => {
  const time = new Date(row.date).getTime();
  return Number.isNaN(time) ? row.date : time;
};

const reporterCell = (row: ReportHubRow) => {
  const meta =
    row.reporterMeta ?? ([row.gradeLevel, row.sectionName].filter(Boolean).join(' · ') || undefined);
  return (
    <div className="leading-tight">
      <span className="font-semibold">{row.reporterName}</span>
      {meta && <span className="block text-[10px] text-[var(--text-strong)]/40">{meta}</span>}
    </div>
  );
};

const totalsCell = (total: number, format: (value: number) => string) =>
  total > 0 ? <span className="font-bold">{format(total)}</span> : <span className="text-[var(--text-strong)]/30">—</span>;

/** Trailing "View" affordance that opens the row-detail pop-up. */
function viewColumn<T>(onView: (row: T) => void): TableColumn<T> {
  return {
    key: 'view',
    header: '',
    align: 'right',
    className: 'w-[72px]',
    cell: (row) => (
      <button
        type="button"
        onClick={() => onView(row)}
        className="inline-flex items-center gap-1 text-[10px] font-bold text-[var(--accent)] hover:underline cursor-pointer"
      >
        View <ChevronRight size={12} />
      </button>
    ),
  };
}

export function wasteTableColumns(onView: (row: ReportHubRow) => void): TableColumn<ReportHubRow>[] {
  return [
    {
      key: 'date',
      header: 'Date',
      value: dateValue,
      cell: (row) => <span className="whitespace-nowrap">{formatLongDate(row.date)}</span>,
      skeleton: 'date',
      className: 'w-[120px]',
    },
    {
      key: 'title',
      header: 'Title',
      value: (row) => row.title,
      cell: (row) => <span className="font-semibold">{row.title}</span>,
      skeleton: 'name',
      className: 'min-w-[260px]',
    },
    {
      key: 'location',
      header: 'Location',
      value: (row) => row.locationName,
      cell: (row) => row.locationName,
      className: 'min-w-[180px]',
    },
    {
      key: 'reporter',
      header: 'Reporter',
      value: (row) => row.reporterName,
      cell: reporterCell,
      className: 'min-w-[160px]',
    },
    {
      key: 'status',
      header: 'Status',
      value: (row) => row.status,
      cell: (row) => <LedgerStatusBadge status={row.status} />,
      skeleton: 'badge',
    },
    viewColumn(onView),
  ];
}

export function assetTableColumns(onView: (row: ReportHubRow) => void): TableColumn<ReportHubRow>[] {
  return [
    {
      key: 'date',
      header: 'Date',
      value: dateValue,
      cell: (row) => <span className="whitespace-nowrap">{formatLongDate(row.date)}</span>,
      skeleton: 'date',
      className: 'w-[120px]',
    },
    {
      key: 'item',
      header: 'Item',
      value: (row) => row.assetItemName ?? 'Unspecified',
      cell: (row) => <span className="font-semibold">{row.assetItemName ?? 'Unspecified'}</span>,
      skeleton: 'name',
    },
    {
      key: 'category',
      header: 'Category',
      value: (row) => row.assetCategoryName ?? 'Other',
      cell: (row) => row.assetCategoryName ?? 'Other',
    },
    {
      key: 'issue',
      header: 'Issue',
      value: (row) => row.title,
      cell: (row) => row.title,
      className: 'min-w-[240px]',
    },
    {
      key: 'location',
      header: 'Location',
      value: (row) => row.locationName,
      cell: (row) => row.locationName,
      className: 'min-w-[180px]',
    },
    {
      key: 'reporter',
      header: 'Reporter',
      value: (row) => row.reporterName,
      cell: reporterCell,
      className: 'min-w-[160px]',
    },
    {
      key: 'status',
      header: 'Status',
      value: (row) => row.status,
      cell: (row) => <LedgerStatusBadge status={row.status} />,
      skeleton: 'badge',
    },
    viewColumn(onView),
  ];
}

export function ledgerTableColumns(onView: (row: LedgerRow) => void): TableColumn<LedgerRow>[] {
  return [
    {
      key: 'date',
      header: 'Date',
      value: dateValue,
      cell: (row) => <span className="whitespace-nowrap">{formatLongDate(row.date)}</span>,
      skeleton: 'date',
      className: 'w-[120px]',
    },
    {
      key: 'material',
      header: 'Material',
      value: (row) => row.materialName,
      cell: (row) => <span className="font-semibold">{row.materialName}</span>,
      skeleton: 'name',
      className: 'min-w-[180px]',
    },
    {
      key: 'weight',
      header: 'Weight (kg)',
      align: 'right',
      value: (row) => row.weightKg,
      cell: (row) => num(row.weightKg),
      footer: (rows) => totalsCell(rows.reduce((sum, row) => sum + row.weightKg, 0), num),
      skeleton: 'number',
    },
    { key: 'price', header: '₱/kg', align: 'right', value: (row) => row.pricePerKg, cell: (row) => peso(row.pricePerKg) },
    {
      key: 'revenue',
      header: 'Revenue',
      align: 'right',
      value: (row) => row.revenue,
      cell: (row) => <span className="font-semibold">{peso(row.revenue)}</span>,
      footer: (rows) => totalsCell(rows.reduce((sum, row) => sum + row.revenue, 0), peso),
      skeleton: 'number',
    },
    { key: 'buyer', header: 'Buyer', value: (row) => row.buyerName, cell: (row) => row.buyerName || '—' },
    viewColumn(onView),
  ];
}

export function walkinTableColumns(onView: (row: WalkInRow) => void): TableColumn<WalkInRow>[] {
  const gradeSection = (row: WalkInRow) => [row.gradeLevel, row.sectionName].filter(Boolean).join(' · ') || '—';
  return [
    {
      key: 'date',
      header: 'Date',
      value: dateValue,
      cell: (row) => <span className="whitespace-nowrap">{formatLongDate(row.date)}</span>,
      skeleton: 'date',
      className: 'w-[120px]',
    },
    {
      key: 'student',
      header: 'Student',
      value: (row) => row.studentName,
      cell: (row) => <span className="font-semibold">{row.studentName}</span>,
      skeleton: 'name',
      className: 'min-w-[200px]',
    },
    { key: 'grade', header: 'Grade / Section', value: gradeSection, cell: gradeSection, className: 'min-w-[150px]' },
    {
      key: 'bottles',
      header: 'Bottles',
      align: 'right',
      value: (row) => row.bottles,
      cell: (row) => row.bottles,
      footer: (rows) => num(rows.reduce((sum, row) => sum + row.bottles, 0)),
      skeleton: 'number',
    },
    {
      key: 'volume',
      header: 'Volume (L)',
      align: 'right',
      value: (row) => row.ml / 1000,
      cell: (row) => num(row.ml / 1000),
      footer: (rows) => num(rows.reduce((sum, row) => sum + row.ml, 0) / 1000),
      skeleton: 'number',
    },
    {
      key: 'grams',
      header: 'Weight (g)',
      align: 'right',
      value: (row) => row.grams,
      cell: (row) => num(row.grams),
      footer: (rows) => num(rows.reduce((sum, row) => sum + row.grams, 0)),
      skeleton: 'number',
    },
    {
      key: 'points',
      header: 'Points',
      align: 'right',
      value: (row) => row.points,
      cell: (row) => row.points,
      footer: (rows) => num(rows.reduce((sum, row) => sum + row.points, 0)),
      skeleton: 'number',
    },
    { key: 'recordedBy', header: 'Recorded by', value: (row) => row.recordedBy, cell: (row) => row.recordedBy || '—' },
    viewColumn(onView),
  ];
}

// ── Year records (points ledger, leaderboard, market stock snapshots) ──

const yearColumn = <T extends { yearLabel: string }>(): TableColumn<T> => ({
  key: 'year',
  header: 'School Year',
  value: (row) => row.yearLabel,
  cell: (row) => <span className="font-semibold text-[var(--text-strong)]/70">SY {row.yearLabel}</span>,
  className: 'whitespace-nowrap',
  skeleton: 'badge',
});

const signedAmountCell = (amount: number) => (
  <span className={amount >= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
    {amount > 0 ? '+' : ''}
    {num(amount)}
  </span>
);

export function pointLedgerTableColumns(
  onView: (row: PointRecord) => void,
  showYear = false,
): TableColumn<PointRecord>[] {
  const columns: TableColumn<PointRecord>[] = [
    {
      key: 'date',
      header: 'Date',
      value: dateValue,
      cell: (row) => <span className="whitespace-nowrap">{formatLongDate(row.date)}</span>,
      skeleton: 'date',
      className: 'w-[120px]',
    },
    {
      key: 'student',
      header: 'Student',
      value: (row) => row.studentName,
      cell: (row) => (
        <div className="leading-tight">
          <span className="font-semibold">{row.studentName}</span>
          {row.gradeLevel && <span className="block text-[10px] text-[var(--text-strong)]/40">{row.gradeLevel}</span>}
        </div>
      ),
      skeleton: 'name',
      className: 'min-w-[180px]',
    },
    {
      key: 'reason',
      header: 'Reason',
      value: (row) => row.reason,
      cell: (row) => row.reason || '—',
      className: 'min-w-[220px]',
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      value: (row) => row.amount,
      cell: (row) => signedAmountCell(row.amount),
      footer: (rows) => num(rows.reduce((sum, row) => sum + row.amount, 0)),
      skeleton: 'number',
    },
  ];
  if (showYear) columns.push(yearColumn<PointRecord>());
  columns.push(viewColumn(onView));
  return columns;
}

export function leaderboardTableColumns(
  onView: (row: LeaderboardRecord) => void,
  showYear = false,
): TableColumn<LeaderboardRecord>[] {
  const gradeSection = (row: LeaderboardRecord) =>
    [row.gradeLevel, row.sectionName].filter(Boolean).join(' · ') || '—';
  const columns: TableColumn<LeaderboardRecord>[] = [
    { key: 'rank', header: 'Rank', align: 'center', value: (row) => row.rank, cell: (row) => <span className="font-bold">{row.rank}</span> },
    {
      key: 'student',
      header: 'Student',
      value: (row) => row.studentName,
      cell: (row) => <span className="font-semibold">{row.studentName}</span>,
      skeleton: 'name',
      className: 'min-w-[200px]',
    },
    { key: 'grade', header: 'Grade / Section', value: gradeSection, cell: gradeSection, className: 'min-w-[150px]' },
    {
      key: 'points',
      header: 'Closing Points',
      align: 'right',
      value: (row) => row.closingPoints,
      cell: (row) => <span className="font-bold text-[var(--gold)]">{num(row.closingPoints)}</span>,
      footer: (rows) => num(rows.reduce((sum, row) => sum + row.closingPoints, 0)),
      skeleton: 'number',
    },
  ];
  if (showYear) columns.push(yearColumn<LeaderboardRecord>());
  columns.push(viewColumn(onView));
  return columns;
}

export function stockTableColumns(
  onView: (row: StockRecord) => void,
  showYear = false,
): TableColumn<StockRecord>[] {
  const columns: TableColumn<StockRecord>[] = [
    {
      key: 'category',
      header: 'Category',
      value: (row) => row.categoryName,
      cell: (row) => <span className="font-semibold">{row.categoryName}</span>,
      skeleton: 'name',
      className: 'min-w-[200px]',
    },
    {
      key: 'opening',
      header: 'Opening (kg)',
      align: 'right',
      value: (row) => row.openingKg,
      cell: (row) => num(row.openingKg),
      footer: (rows) => num(rows.reduce((sum, row) => sum + row.openingKg, 0)),
      skeleton: 'number',
    },
    {
      key: 'closing',
      header: 'Closing (kg)',
      align: 'right',
      value: (row) => row.closingKg,
      cell: (row) => num(row.closingKg),
      footer: (rows) => num(rows.reduce((sum, row) => sum + row.closingKg, 0)),
      skeleton: 'number',
    },
    {
      key: 'net',
      header: 'Net (kg)',
      align: 'right',
      value: (row) => row.closingKg - row.openingKg,
      cell: (row) => num(row.closingKg - row.openingKg),
      footer: (rows) =>
        num(rows.reduce((sum, row) => sum + row.closingKg - row.openingKg, 0)),
      skeleton: 'number',
    },
  ];
  if (showYear) columns.push(yearColumn<StockRecord>());
  columns.push(viewColumn(onView));
  return columns;
}
