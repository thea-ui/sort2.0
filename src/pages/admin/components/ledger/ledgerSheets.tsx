import React from 'react';
import { Boxes, ChevronRight, Coins, FileText, Scale, Trophy } from 'lucide-react';
import type { TableColumn } from '../../../../components/data-table/types';
import {
  LedgerPointTxn,
  LedgerReportRow,
  SchoolYearLedger,
} from '../../../../hooks/useSchoolYear';
import { num, peso, shortDate } from './ledgerFormatters';
import { LedgerStatusBadge } from './LedgerStatusBadge';
import { MetricCell } from './ledgerCells';

/** Trailing "View" affordance column for ledger sheets. */
const createViewColumn = <T,>(): TableColumn<T> => ({
  key: 'view',
  header: '',
  align: 'right',
  className: 'w-[52px]',
  cell: () => (
    <span className="inline-flex items-center justify-end gap-1 text-[10px] font-bold text-[var(--accent)]">
      View <ChevronRight size={13} />
    </span>
  ),
});

export interface LedgerSheet {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
  columns: TableColumn<any>[];
  rows: any[];
  minWidth?: string;
}

export function buildLedgerSheets(ledger: SchoolYearLedger): LedgerSheet[] {
  const L = ledger;

  const reportCols: TableColumn<LedgerReportRow>[] = [
    {
      key: 'date',
      header: 'Date',
      value: (r) => r.createdAt,
      cell: (r) => <span className="whitespace-nowrap">{shortDate(r.createdAt)}</span>,
    },
    { key: 'title', header: 'Report', value: (r) => r.title, cell: (r) => <span className="font-bold">{r.title}</span> },
    {
      key: 'reporter',
      header: 'Reporter',
      value: (r) => r.reporterName,
      cell: (r) => (
        <div className="leading-tight">
          <span className="font-semibold">{r.reporterName}</span>
          {r.gradeLevel && (
            <span className="block text-[10px] text-[var(--text-strong)]/40">
              {r.gradeLevel}
              {r.sectionName ? ` · ${r.sectionName}` : ''}
            </span>
          )}
        </div>
      ),
    },
    { key: 'location', header: 'Location', value: (r) => r.locationName },
    { key: 'category', header: 'Category', value: (r) => r.category },
    {
      key: 'status',
      header: 'Status',
      value: (r) => r.status,
      cell: (r) => <LedgerStatusBadge status={r.status} />,
    },
    { key: 'urgency', header: 'Urgency', align: 'center', value: (r) => r.urgency },
    {
      key: 'weight',
      header: 'Weight (kg)',
      align: 'right',
      value: (r) => r.weightCollected,
      cell: (r) => <MetricCell value={r.weightCollected} status={r.status} />,
      footer: (rows) => num(rows.reduce((s, r) => s + r.weightCollected, 0)),
    },
    {
      key: 'points',
      header: 'Points',
      align: 'right',
      value: (r) => r.pointsAwarded,
      cell: (r) => <MetricCell value={r.pointsAwarded} status={r.status} />,
      footer: (rows) => num(rows.reduce((s, r) => s + r.pointsAwarded, 0)),
    },
  ];

  const pointCols: TableColumn<LedgerPointTxn>[] = [
    {
      key: 'date',
      header: 'Date',
      value: (p) => p.createdAt,
      cell: (p) => <span className="whitespace-nowrap">{shortDate(p.createdAt)}</span>,
    },
    {
      key: 'student',
      header: 'Student',
      value: (p) => p.userName,
      cell: (p) => (
        <div className="leading-tight">
          <span className="font-semibold">{p.userName}</span>
          {p.gradeLevel && (
            <span className="block text-[10px] text-[var(--text-strong)]/40">{p.gradeLevel}</span>
          )}
        </div>
      ),
    },
    { key: 'reason', header: 'Reason', value: (p) => p.reason },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      value: (p) => p.amount,
      cell: (p) => (
        <span className={p.amount >= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
          {p.amount > 0 ? '+' : ''}
          {p.amount}
        </span>
      ),
      footer: (rows) => num(rows.reduce((s, r) => s + r.amount, 0)),
    },
  ];

  return [
    {
      id: 'reports',
      label: 'Reports',
      icon: FileText,
      columns: [...reportCols, createViewColumn<LedgerReportRow>()],
      rows: L.reports.rows,
      minWidth: '1100px',
    },
    {
      id: 'points',
      label: 'Points Ledger',
      icon: Coins,
      columns: [...pointCols, createViewColumn<LedgerPointTxn>()],
      rows: L.points.transactions,
      minWidth: '720px',
    },
    {
      id: 'leaderboard',
      label: 'Leaderboard',
      icon: Trophy,
      minWidth: '640px',
      columns: [
        { key: 'rank', header: 'Rank', align: 'center', value: (s: any) => s.rank },
        { key: 'name', header: 'Student', value: (s: any) => s.name, cell: (s: any) => <span className="font-bold">{s.name}</span> },
        { key: 'grade', header: 'Grade', value: (s: any) => s.gradeLevel || '' },
        { key: 'section', header: 'Section', value: (s: any) => s.sectionName || '' },
        {
          key: 'points',
          header: 'Closing Points',
          align: 'right',
          value: (s: any) => s.closingPoints,
          footer: (rows: any[]) => num(rows.reduce((a, r) => a + r.closingPoints, 0)),
        },
        createViewColumn<any>(),
      ],
      rows: L.points.topStudents,
    },
    {
      id: 'sales',
      label: 'Market Sales',
      icon: Scale,
      minWidth: '820px',
      columns: [
        {
          key: 'date',
          header: 'Date',
          value: (t: any) => t.soldAt,
          cell: (t: any) => <span className="whitespace-nowrap">{shortDate(t.soldAt)}</span>,
        },
        { key: 'category', header: 'Category', value: (t: any) => t.categoryName, cell: (t: any) => <span className="font-bold">{t.categoryName}</span> },
        {
          key: 'kg',
          header: 'Weight (kg)',
          align: 'right',
          value: (t: any) => t.weightKg,
          footer: (rows: any[]) => num(rows.reduce((a, r) => a + r.weightKg, 0)),
        },
        { key: 'price', header: '₱/kg', align: 'right', value: (t: any) => t.marketPriceKg },
        {
          key: 'revenue',
          header: 'Revenue',
          align: 'right',
          value: (t: any) => t.totalRevenue,
          cell: (t: any) => peso(t.totalRevenue),
          footer: (rows: any[]) => peso(rows.reduce((a, r) => a + r.totalRevenue, 0)),
        },
        { key: 'buyer', header: 'Buyer', value: (t: any) => t.buyerName },
        createViewColumn<any>(),
      ],
      rows: L.market.sales,
    },
    {
      id: 'stock',
      label: 'Market Stock',
      icon: Boxes,
      minWidth: '620px',
      columns: [
        { key: 'category', header: 'Category', value: (s: any) => s.categoryName, cell: (s: any) => <span className="font-bold">{s.categoryName}</span> },
        {
          key: 'opening',
          header: 'Opening (kg)',
          align: 'right',
          value: (s: any) => s.openingKg,
          footer: (rows: any[]) => num(rows.reduce((a, r) => a + r.openingKg, 0)),
        },
        {
          key: 'closing',
          header: 'Closing (kg)',
          align: 'right',
          value: (s: any) => s.closingKg,
          footer: (rows: any[]) => num(rows.reduce((a, r) => a + r.closingKg, 0)),
        },
        {
          key: 'net',
          header: 'Net (kg)',
          align: 'right',
          value: (s: any) => s.closingKg - s.openingKg,
          cell: (s: any) => num(s.closingKg - s.openingKg),
        },
        createViewColumn<any>(),
      ],
      rows: L.market.snapshots,
    },
  ];
}
