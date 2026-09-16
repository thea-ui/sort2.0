import { Report } from '../types';

export const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

export function getReportTimestampMs(timestamp?: string): number {
  if (!timestamp) return 0;
  let ts = timestamp.trim();
  if (ts.includes(' ')) {
    ts = ts.replace(' ', 'T');
  }
  if (!ts.endsWith('Z') && !ts.includes('+') && !ts.slice(10).includes('-')) {
    ts += 'Z';
  }
  const val = new Date(ts).getTime();
  return !isNaN(val) && val > 0 ? val : 0;
}

export function isReportDoneAndExpired(report: Report, cutoffMs = SIX_HOURS_MS): boolean {
  const isDone = report.status === 'COLLECTED' || 
                 report.status === 'RESOLVED' || 
                 report.status === 'EXPIRED' ||
                 report.title?.toLowerCase().includes('[dismissed]') || 
                 report.description?.toLowerCase().includes('[dismissed]');

  if (!isDone) return false;

  const completedMs = getReportTimestampMs(report.completedAt) || getReportTimestampMs(report.timestamp);
  if (completedMs === 0) return false;

  const now = Date.now();
  return (now - completedMs) >= cutoffMs;
}

export function cleanReportTitle(title?: string): string {
  if (!title) return 'Waste Report';
  let cleaned = title.trim();
  // Remove grid coordinates like "at Grid [14.6015, 120.9865]" or "Grid [14.6015, 120.9865]"
  cleaned = cleaned.replace(/\s*at\s*Grid\s*\[[^\]]+\]/gi, '');
  cleaned = cleaned.replace(/\s*Grid\s*\[[^\]]+\]/gi, '');
  if (cleaned.toLowerCase().includes('scattered debris')) {
    if (cleaned.toLowerCase().startsWith('waste report at scattered debris') || cleaned.toLowerCase() === 'waste report') {
      return 'Scattered Debris';
    }
  }
  return cleaned.trim() || 'Scattered Debris';
}

export function cleanLocationName(locationName?: string): string {
  if (!locationName) return 'Campus Station';
  let cleaned = locationName.trim();
  cleaned = cleaned.replace(/\s*at\s*Grid\s*\[[^\]]+\]/gi, '');
  cleaned = cleaned.replace(/\s*Grid\s*\[[^\]]+\]/gi, '');
  return cleaned.trim() || 'Campus Station';
}

export function getGridCoordinateString(coords?: { lat: number; lng: number } | null): string | null {
  if (!coords || (coords.lat === 0 && coords.lng === 0)) return null;
  return `Grid [${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}]`;
}

/**
 * Parse bracketed metadata tags like "[Pillar: FURNITURE][Observation: Damaged]"
 * into a lowercase-keyed map.
 */
export function parseReportTags(description?: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!description) return out;
  const re = /\[([^\]:]+):\s*([^\]]+)\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(description)) !== null) {
    out[m[1].trim().toLowerCase()] = m[2].trim();
  }
  return out;
}

/** Remove all bracketed tags, leaving only free text. */
export function stripReportTags(description?: string): string {
  if (!description) return '';
  return description.replace(/\[[^\]]*\]/g, ' ').replace(/\s+/g, ' ').trim();
}


export function filterActiveReports(reports: Report[]): Report[] {
  return reports.filter(r => !isReportDoneAndExpired(r));
}
