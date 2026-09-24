import { Report } from '../types';
import { getReportTimestampMs } from './reportUtils';

/** Reports queue day-scope uses the school's local day (matches the 6 PM reset TZ). */
export const REPORT_QUEUE_TZ = 'Asia/Manila';

export type ReportQueueScope = 'ALL' | 'WASTE' | 'ASSET';

export type OffenseSeverity = 'WARNING' | 'DEDUCT' | 'SUSPENSION';

export interface ReportQueueFilters {
  activeFilter: ReportQueueScope;
  searchQuery: string;
  statusFilter: string;
}

export interface ReportLocationGroup {
  id: string;
  locationName: string;
  category: string;
  reports: Report[];
  latestTime: number;
  activeCount: number;
  completedCount: number;
}

export function isSameLocalDay(iso?: string): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return false;
  try {
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: REPORT_QUEUE_TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return fmt.format(d) === fmt.format(new Date());
  } catch {
    return d.toDateString() === new Date().toDateString();
  }
}

/** Queue ordering timestamp: parsed timestamp, else the `rep-<n>` id fallback. */
export function getQueueReportTimeMs(report: Pick<Report, 'id' | 'timestamp'>): number {
  const fromTimestamp = getReportTimestampMs(report.timestamp);
  if (fromTimestamp) return fromTimestamp;
  if (report.id?.startsWith('rep-')) {
    const num = parseInt(report.id.replace('rep-', ''), 10);
    if (!isNaN(num)) return num;
  }
  return 0;
}

const ASSET_PILLARS = [
  '[PILLAR: FURNITURE]',
  '[PILLAR: ELECTRONICS]',
  '[PILLAR: FIXTURES]',
  '[PILLAR: EQUIPMENT]',
  '[PILLAR: OTHER]',
];

export function isAssetReport(
  report: Pick<Report, 'reportType' | 'description'>,
): boolean {
  if (report.reportType === 'ASSET') return true;
  const desc = (report.description || '').toUpperCase();
  return ASSET_PILLARS.some((pillar) => desc.includes(pillar));
}

/**
 * Operational queue scope: today's reports plus still-active older reports.
 * EXPIRED is terminal/neutral and lives in History/Collections, not the queue.
 */
export function filterQueueReports(
  reports: Report[],
  { activeFilter, searchQuery, statusFilter }: ReportQueueFilters,
): Report[] {
  return reports
    .filter((r) => {
      if (r.status === 'EXPIRED') return false;
      const isActiveReport = r.status === 'PENDING' || r.status === 'DISPATCHED';
      if (!isActiveReport && !isSameLocalDay(r.timestamp)) return false;

      const isAsset = isAssetReport(r);
      if (activeFilter === 'WASTE' && isAsset) return false;
      if (activeFilter === 'ASSET' && !isAsset) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = r.title.toLowerCase().includes(q);
        const matchLoc = r.locationName.toLowerCase().includes(q);
        const matchReporter = r.reporterName.toLowerCase().includes(q);
        const matchDesc = r.description.toLowerCase().includes(q);
        if (!matchTitle && !matchLoc && !matchReporter && !matchDesc) return false;
      }

      if (statusFilter === 'UNVERIFIED' && r.isVerified) return false;
      if (
        statusFilter === 'VERIFIED' &&
        (!r.isVerified || r.status === 'DISPATCHED' || r.status === 'COLLECTED' || r.status === 'RESOLVED')
      ) {
        return false;
      }
      if (statusFilter === 'DISPATCHED' && r.status !== 'DISPATCHED') return false;
      if (statusFilter === 'DISMISSED' && r.status !== 'DISMISSED') return false;
      if (statusFilter === 'DONE' && r.status !== 'COLLECTED' && r.status !== 'RESOLVED') return false;

      return true;
    })
    .sort((a, b) => getQueueReportTimeMs(b) - getQueueReportTimeMs(a));
}

/**
 * Group reports into bin streams: each unique location + category pair is one
 * group, ordered by its most recent report.
 */
export function groupReportsByLocation(reports: Report[]): ReportLocationGroup[] {
  const groupedMap: Record<string, Report[]> = {};
  reports.forEach((r) => {
    const locKey = `${r.locationName || 'General Campus Location'}__${r.category || 'GENERAL'}`;
    if (!groupedMap[locKey]) groupedMap[locKey] = [];
    groupedMap[locKey].push(r);
  });

  return Object.keys(groupedMap)
    .map((locKey, index) => {
      const [locName, cat] = locKey.split('__');
      const groupReports = groupedMap[locKey].sort(
        (a, b) => getQueueReportTimeMs(b) - getQueueReportTimeMs(a),
      );
      const latestTime = groupReports[0] ? getQueueReportTimeMs(groupReports[0]) : 0;
      const activeCount = groupReports.filter(
        (r) => r.status === 'PENDING' || r.status === 'DISPATCHED',
      ).length;
      const completedCount = groupReports.filter(
        (r) => r.status === 'COLLECTED' || r.status === 'RESOLVED',
      ).length;
      return {
        id: `group-${index}`,
        locationName: locName,
        category: cat,
        reports: groupReports,
        latestTime,
        activeCount,
        completedCount,
      };
    })
    .sort((gA, gB) => gB.latestTime - gA.latestTime);
}

export function getCategoryLabel(category?: string): string {
  if (category === 'RECYCLABLE') return 'Recyclable';
  if (category === 'BIODEGRADABLE') return 'Biodegradable';
  if (category === 'HAZARDOUS') return 'Hazardous';
  return 'Non-Biodegradable';
}

export function getCategoryStyle(category?: string): string {
  if (category === 'RECYCLABLE') {
    return 'bg-[var(--primary)]/10 text-[var(--text-strong)] border-[var(--primary)]/25';
  }
  if (category === 'BIODEGRADABLE') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (category === 'HAZARDOUS') return 'bg-rose-100 text-rose-700 border-rose-200';
  return 'bg-amber-100 text-amber-700 border-amber-200';
}

/** Offense escalation by prior warning count: 1st warns, 2nd deducts, 3rd+ suspends. */
export function computeOffenseSeverity(warningsCount = 0): OffenseSeverity {
  const level = warningsCount + 1;
  return level === 1 ? 'WARNING' : level === 2 ? 'DEDUCT' : 'SUSPENSION';
}
