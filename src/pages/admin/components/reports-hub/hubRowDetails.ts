import { formatLongDate } from '../../../../utils/dateFormat';
import { num, peso } from './ledgerFormatters';
import { streamLabel } from './reportHubRows';
import type {
  LeaderboardRecord,
  LedgerRow,
  PointRecord,
  ReportHubRow,
  StockRecord,
  WalkInRow,
} from './reportHubTypes';

/** Label/value pairs shown by the admin row-detail pop-up. */
export interface HubRowDetailField {
  label: string;
  value: string;
}

export interface HubRowDetail {
  title: string;
  subtitle?: string;
  fields: HubRowDetailField[];
}

const titleCase = (value: string) => value.charAt(0) + value.slice(1).toLowerCase();
const numOrDash = (value: number) => (value > 0 ? num(value) : '—');
const pointsOrDash = (value: number) => (value > 0 ? String(value) : '—');
const orDash = (value?: string | null) => (value && value.trim() ? value : '—');

const reporterText = (row: ReportHubRow) => {
  const meta =
    row.reporterMeta ?? ([row.gradeLevel, row.sectionName].filter(Boolean).join(' · ') || undefined);
  return meta ? `${row.reporterName} (${meta})` : row.reporterName;
};

const gradeSection = (row: WalkInRow) => [row.gradeLevel, row.sectionName].filter(Boolean).join(' · ') || '—';

export function wasteRowDetail(row: ReportHubRow): HubRowDetail {
  return {
    title: row.title,
    subtitle: `Waste report · ${formatLongDate(row.date)}`,
    fields: [
      { label: 'Date', value: formatLongDate(row.date) },
      { label: 'Report ID', value: row.id },
      { label: 'Stream', value: streamLabel(row.stream) },
      { label: 'Material', value: orDash(row.materialName) },
      { label: 'Location', value: orDash(row.locationName) },
      { label: 'Reporter', value: reporterText(row) },
      { label: 'Grade level', value: orDash(row.gradeLevel) },
      { label: 'Section', value: orDash(row.sectionName) },
      { label: 'Status', value: titleCase(row.status) },
      { label: 'Urgency', value: titleCase(row.urgency) },
      { label: 'Weight (kg)', value: numOrDash(row.weightKg) },
      { label: 'Points', value: pointsOrDash(row.points) },
    ],
  };
}

export function assetRowDetail(row: ReportHubRow): HubRowDetail {
  return {
    title: row.assetItemName ?? row.title,
    subtitle: `Asset report · ${formatLongDate(row.date)}`,
    fields: [
      { label: 'Date', value: formatLongDate(row.date) },
      { label: 'Report ID', value: row.id },
      { label: 'Item', value: orDash(row.assetItemName) },
      { label: 'Category', value: orDash(row.assetCategoryName) },
      { label: 'Issue', value: row.title },
      { label: 'Location', value: orDash(row.locationName) },
      { label: 'Reporter', value: reporterText(row) },
      { label: 'Status', value: titleCase(row.status) },
    ],
  };
}

export function ledgerRowDetail(row: LedgerRow): HubRowDetail {
  return {
    title: row.materialName,
    subtitle: `${row.kind === 'MARKET' ? 'Recyclables sale' : 'Asset scrap sale'} · ${formatLongDate(row.date)}`,
    fields: [
      { label: 'Date', value: formatLongDate(row.date) },
      { label: 'Material', value: row.materialName },
      { label: 'Weight (kg)', value: num(row.weightKg) },
      { label: 'Price per kg', value: peso(row.pricePerKg) },
      { label: 'Revenue', value: peso(row.revenue) },
      { label: 'Buyer', value: orDash(row.buyerName) },
    ],
  };
}

export function walkinRowDetail(row: WalkInRow): HubRowDetail {
  return {
    title: row.studentName,
    subtitle: `Walk-in turnover · ${formatLongDate(row.date)}`,
    fields: [
      { label: 'Date', value: formatLongDate(row.date) },
      { label: 'Student', value: row.studentName },
      { label: 'Grade / Section', value: gradeSection(row) },
      { label: 'Bottles', value: num(row.bottles) },
      { label: 'Volume (L)', value: num(row.ml / 1000) },
      { label: 'Weight (g)', value: num(row.grams) },
      { label: 'Points', value: num(row.points) },
      { label: 'Recorded by', value: orDash(row.recordedBy) },
    ],
  };
}

export function pointRecordDetail(row: PointRecord): HubRowDetail {
  return {
    title: row.studentName,
    subtitle: `Point ledger entry · ${formatLongDate(row.date)}`,
    fields: [
      { label: 'Date', value: formatLongDate(row.date) },
      { label: 'School Year', value: `SY ${row.yearLabel}` },
      { label: 'Student', value: row.studentName },
      { label: 'Grade level', value: orDash(row.gradeLevel) },
      { label: 'Reason', value: orDash(row.reason) },
      { label: 'Amount', value: row.amount > 0 ? `+${row.amount}` : String(row.amount) },
    ],
  };
}

export function leaderboardRecordDetail(row: LeaderboardRecord): HubRowDetail {
  return {
    title: row.studentName,
    subtitle: `Leaderboard snapshot · SY ${row.yearLabel}`,
    fields: [
      { label: 'School Year', value: `SY ${row.yearLabel}` },
      { label: 'Rank', value: `#${row.rank}` },
      { label: 'Student', value: row.studentName },
      { label: 'Grade / Section', value: [row.gradeLevel, row.sectionName].filter(Boolean).join(' · ') || '—' },
      { label: 'Closing Points', value: num(row.closingPoints) },
    ],
  };
}

export function stockRecordDetail(row: StockRecord): HubRowDetail {
  const net = row.closingKg - row.openingKg;
  return {
    title: row.categoryName,
    subtitle: `Market stock snapshot · SY ${row.yearLabel}`,
    fields: [
      { label: 'School Year', value: `SY ${row.yearLabel}` },
      { label: 'Category', value: row.categoryName },
      { label: 'Opening (kg)', value: num(row.openingKg) },
      { label: 'Closing (kg)', value: num(row.closingKg) },
      { label: 'Net (kg)', value: num(net) },
    ],
  };
}
