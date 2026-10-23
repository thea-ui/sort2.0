import { toDateKey } from '../../../../utils/dateFormat';
import type {
  LeaderboardRecord,
  PointRecord,
  ReportHubFilters,
  StockRecord,
} from './reportHubTypes';

/** Filter/sort/totals helpers for the Year Records folder leaves. */

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

const byDate = (a: { date: string }, b: { date: string }) => new Date(a.date).getTime() - new Date(b.date).getTime();

export function filterPointRecords(rows: PointRecord[], filters: ReportHubFilters): PointRecord[] {
  const filtered = rows.filter((row) => {
    if (!withinRange(row.date, filters.from, filters.to)) return false;
    return matchesQuery([row.studentName, row.gradeLevel, row.reason], filters.query);
  });
  const sorted = [...filtered];
  switch (filters.sort) {
    case 'oldest':
      sorted.sort(byDate);
      break;
    case 'title':
      sorted.sort((a, b) => a.studentName.localeCompare(b.studentName));
      break;
    case 'weight':
      sorted.sort((a, b) => b.amount - a.amount);
      break;
    default:
      sorted.sort((a, b) => byDate(b, a));
  }
  return sorted;
}

export function filterLeaderboardRecords(
  rows: LeaderboardRecord[],
  filters: ReportHubFilters,
): LeaderboardRecord[] {
  const filtered = rows.filter((row) =>
    matchesQuery([row.studentName, row.gradeLevel, row.sectionName, row.yearLabel], filters.query),
  );
  const sorted = [...filtered];
  if (filters.sort === 'title') {
    sorted.sort((a, b) => a.studentName.localeCompare(b.studentName));
  } else if (filters.sort === 'weight') {
    sorted.sort((a, b) => b.closingPoints - a.closingPoints);
  } else {
    sorted.sort((a, b) => a.rank - b.rank);
  }
  return sorted;
}

export function filterStockRecords(rows: StockRecord[], filters: ReportHubFilters): StockRecord[] {
  const filtered = rows.filter((row) => matchesQuery([row.categoryName, row.yearLabel], filters.query));
  const sorted = [...filtered];
  if (filters.sort === 'weight') {
    sorted.sort((a, b) => b.closingKg - a.closingKg);
  } else {
    sorted.sort((a, b) => a.categoryName.localeCompare(b.categoryName));
  }
  return sorted;
}

// Totals-cell formatting mirrors reportHubRows: 0 prints as an em-dash, while
// signed point sums always print their exact value.
const fmtNumOrZero = (value: number) => value.toLocaleString('en-PH', { maximumFractionDigits: 2 });
const fmtNum = (value: number) => (value !== 0 ? fmtNumOrZero(value) : '—');

/** Totals row aligned to the points-ledger columns (Year column optional). */
export function pointsFooter(rows: PointRecord[], showYear: boolean): (string | number)[] {
  const total = rows.reduce((sum, row) => sum + row.amount, 0);
  const footer: (string | number)[] = [
    'TOTAL',
    `${rows.length} ${rows.length === 1 ? 'entry' : 'entries'}`,
    '',
    fmtNumOrZero(total),
  ];
  if (showYear) footer.push('');
  return footer;
}

/** Totals row aligned to the leaderboard columns (Year column optional). */
export function leaderboardFooter(rows: LeaderboardRecord[], showYear: boolean): (string | number)[] {
  const total = rows.reduce((sum, row) => sum + row.closingPoints, 0);
  const footer: (string | number)[] = [
    'TOTAL',
    `${rows.length} ${rows.length === 1 ? 'student' : 'students'}`,
    '',
    fmtNumOrZero(total),
  ];
  if (showYear) footer.push('');
  return footer;
}

/** Totals row aligned to the market-stock columns (Year column optional). */
export function stockFooter(rows: StockRecord[], showYear: boolean): (string | number)[] {
  const opening = rows.reduce((sum, row) => sum + row.openingKg, 0);
  const closing = rows.reduce((sum, row) => sum + row.closingKg, 0);
  const footer: (string | number)[] = ['TOTAL', fmtNum(opening), fmtNum(closing), fmtNum(closing - opening)];
  if (showYear) footer.push('');
  return footer;
}
