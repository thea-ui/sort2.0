import { useMemo } from 'react';
import type { Report } from '../types';
import { residualRecords } from '../utils/wasteStreams';

export interface ResidualWeekBucket {
  label: string;
  reports: number;
  pickups: number;
}

export interface ResidualStationCount {
  locationName: string;
  reports: number;
}

export interface ResidualMetrics {
  totalReports: number;
  completedPickups: number;
  awaitingPickup: number;
  oldestAwaitingDays: number | null;
  avgDaysToCollect: number | null;
  weekly: ResidualWeekBucket[];
  topStations: ResidualStationCount[];
  shareOfAllReports: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
const WEEKS = 6;

function parseTime(value?: string | null): number | null {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
}

function startOfWeek(time: number): number {
  const date = new Date(time);
  date.setHours(0, 0, 0, 0);
  const mondayOffset = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - mondayOffset);
  return date.getTime();
}

/**
 * Residual waste (NON_BIODEGRADABLE) is not weighed in SORT, so it is monitored
 * by volume and pickup activity instead of kilos: report counts, completed
 * pickups, pending backlog age, weekly trend and the busiest stations.
 */
export function useResidualMetrics(reports: Report[]): ResidualMetrics {
  return useMemo(() => {
    const residual = residualRecords(reports);
    const now = Date.now();
    const currentWeekStart = startOfWeek(now);

    const completed = residual.filter(r => r.status === 'COLLECTED' || r.status === 'RESOLVED');
    const awaiting = residual.filter(r => r.status === 'PENDING' || r.status === 'DISPATCHED');

    const awaitingAges = awaiting
      .map(r => parseTime(r.timestamp))
      .filter((t): t is number => t !== null)
      .map(t => (now - t) / DAY_MS);
    const oldestAwaitingDays = awaitingAges.length > 0 ? Math.max(...awaitingAges) : null;

    const collectDurations = completed
      .map(r => {
        const start = parseTime(r.timestamp);
        const end = parseTime(r.completedAt);
        if (start === null || end === null || end < start) return null;
        return (end - start) / DAY_MS;
      })
      .filter((d): d is number => d !== null);
    const avgDaysToCollect =
      collectDurations.length > 0
        ? collectDurations.reduce((sum, d) => sum + d, 0) / collectDurations.length
        : null;

    const buckets = Array.from({ length: WEEKS }, (_, index) => {
      const weekStart = currentWeekStart - index * WEEK_MS;
      return {
        label: new Date(weekStart).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        reports: 0,
        pickups: 0,
      };
    });

    const bucketIndexFor = (time: number): number | null => {
      const index = Math.floor((currentWeekStart - startOfWeek(time)) / WEEK_MS);
      return index >= 0 && index < WEEKS ? index : null;
    };

    for (const report of residual) {
      const submitted = parseTime(report.timestamp);
      if (submitted !== null) {
        const index = bucketIndexFor(submitted);
        if (index !== null) buckets[index].reports += 1;
      }
      const collected = parseTime(report.completedAt);
      if (collected !== null) {
        const index = bucketIndexFor(collected);
        if (index !== null) buckets[index].pickups += 1;
      }
    }

    const stationMap = new Map<string, number>();
    for (const report of residual) {
      const name = report.locationName?.trim() || 'Unknown location';
      stationMap.set(name, (stationMap.get(name) || 0) + 1);
    }
    const topStations = Array.from(stationMap.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([locationName, count]) => ({ locationName, reports: count }));

    return {
      totalReports: residual.length,
      completedPickups: completed.length,
      awaitingPickup: awaiting.length,
      oldestAwaitingDays,
      avgDaysToCollect,
      weekly: [...buckets].reverse(),
      topStations,
      shareOfAllReports: reports.length > 0 ? residual.length / reports.length : 0,
    };
  }, [reports]);
}
