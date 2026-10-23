import React from 'react';
import type { PrintTarget, ReportHubFilters } from '../admin/components/reports-hub/reportHubTypes';
import {
  MIXED_RECYCLABLE,
  OTHER_ITEM_KEY,
  RECYCLABLE_MATERIALS,
  SCRAP_MATERIALS,
  streamLabel,
} from '../admin/components/reports-hub/reportHubRows';
import type { ReportPdfPayload } from '../../types';
import { formatLongDate, formatTime } from '../../utils/dateFormat';
import type { PrintColumn } from './ReportPrintTable';

/** Shared title / metadata / PDF payload model for the print page and the hub. */

export function resolvePrintMaterialName(target: PrintTarget): string {
  if (!target.material) return '';
  const list = target.section === 'ledger-scrap' ? SCRAP_MATERIALS : [...RECYCLABLE_MATERIALS, MIXED_RECYCLABLE];
  return list.find((material) => material.code === target.material)?.name ?? target.material;
}

export function resolveItemLabel(target: PrintTarget): string {
  return target.itemName === OTHER_ITEM_KEY ? 'Other Items' : target.itemName ?? '';
}

export function buildPrintTitle(target: PrintTarget, assetCategoryName: string): string {
  const materialName = resolvePrintMaterialName(target);
  switch (target.section) {
    case 'asset':
      return ['Asset Reports', assetCategoryName, resolveItemLabel(target)].filter(Boolean).join(' — ');
    case 'ledger-market':
      return ['Sales Ledger', 'Recyclables Sold', materialName].filter(Boolean).join(' — ');
    case 'ledger-scrap':
      return ['Sales Ledger', 'Asset Scrap Sold', materialName].filter(Boolean).join(' — ');
    case 'walkin':
      return 'Walk-in Bottle Turnovers';
    case 'points':
      return 'Year Records — Points Ledger';
    case 'leaderboard':
      return 'Year Records — Leaderboard (Closing Points)';
    case 'stock':
      return 'Year Records — Market Stock Snapshots';
    default:
      return ['Waste Reports', target.stream ? streamLabel(target.stream) : '', materialName].filter(Boolean).join(' — ');
  }
}

export function buildFilterSummaryLines(filters: ReportHubFilters, yearLabel: string): string[] {
  const lines = [`School Year: ${yearLabel}`];
  if (filters.from || filters.to) {
    const from = filters.from ? formatLongDate(`${filters.from}T00:00:00`) : 'Beginning';
    const to = filters.to ? formatLongDate(`${filters.to}T00:00:00`) : 'Today';
    lines.push(`Date range: ${from} to ${to}`);
  }
  if (filters.statuses.length > 0) {
    lines.push(`Statuses: ${filters.statuses.map((s) => s.charAt(0) + s.slice(1).toLowerCase()).join(', ')}`);
  }
  if (filters.gradeLevels.length > 0) {
    lines.push(`Grade level: ${filters.gradeLevels.join(', ')}`);
  }
  if (filters.query.trim()) {
    lines.push(`Search: "${filters.query.trim()}"`);
  }
  return lines;
}

export interface PrintJob {
  title: string;
  yearLabel: string;
  metaLines: string[];
  recordCount: number;
  generatedLabel: string;
  payload: ReportPdfPayload;
  fileName: string;
}

interface PrintJobInput<T> {
  target: PrintTarget;
  filters: ReportHubFilters;
  yearLabel: string;
  assetCategoryName?: string;
  /** Optional location refinement applied on the print page. */
  location?: string;
  columns: PrintColumn<T>[];
  rows: T[];
  footer?: React.ReactNode[];
  generatedAt?: Date;
}

/**
 * Builds the header text (title + filter summary) and the exact PDF payload
 * for a leaf folder, so the on-screen table, the browser printout and the
 * server-rendered PDF all show identical data.
 */
export function buildPrintJob<T>(input: PrintJobInput<T>): PrintJob {
  const { target, filters, columns, rows, footer } = input;
  const generatedAt = input.generatedAt ?? new Date();
  const title = buildPrintTitle(target, input.assetCategoryName ?? '');
  const metaLines = buildFilterSummaryLines(filters, input.yearLabel);
  if (input.location) metaLines.push(`Location: ${input.location}`);
  const generatedLabel = `${formatLongDate(generatedAt)} · ${formatTime(generatedAt)}`;

  const payload: ReportPdfPayload = {
    title,
    metaLines,
    recordCount: rows.length,
    generatedLabel,
    columns: columns.map((column) => ({
      header: column.header,
      width: column.pdf?.width ?? 10,
      align: column.align,
      small: column.pdf?.small,
    })),
    rows: rows.map((row) =>
      columns.map((column) => {
        const value = column.pdfValue ? column.pdfValue(row) : column.csv(row);
        return String(value ?? '');
      }),
    ),
    totals: footer ? footer.map((value) => (value === null || value === undefined ? '' : String(value))) : undefined,
  };

  return {
    title,
    yearLabel: input.yearLabel,
    metaLines,
    recordCount: rows.length,
    generatedLabel,
    payload,
    fileName: `${title.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase()}.pdf`,
  };
}
