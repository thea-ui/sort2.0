import { useEffect, useMemo, useState } from 'react';
import { apiService } from '../../../../services/api';
import { useSchoolYear } from '../../../../hooks/useSchoolYear';
import type { LeaderboardRecord, PointRecord, StockRecord } from './reportHubTypes';

export interface YearRecords {
  points: PointRecord[];
  leaderboard: LeaderboardRecord[];
  stock: StockRecord[];
  loading: boolean;
  degraded: boolean;
}

function toIso(value: unknown): string {
  if (typeof value !== 'string' || !value) return '';
  const normalized = value.includes(' ') && !value.includes('T') ? value.replace(' ', 'T') : value;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

interface RecordsAccumulator {
  points: PointRecord[];
  leaderboard: LeaderboardRecord[];
  stock: StockRecord[];
}

function collectLedger(ledger: any, into: RecordsAccumulator): void {
  const yearId: string = ledger?.schoolYear?.id ?? '';
  const yearLabel: string = ledger?.schoolYear?.label ?? '';

  for (const txn of ledger?.points?.transactions ?? []) {
    into.points.push({
      id: txn.id,
      yearId,
      yearLabel,
      date: toIso(txn.createdAt),
      studentName: txn.userName ?? 'Unknown',
      gradeLevel: txn.gradeLevel ?? undefined,
      amount: txn.amount ?? 0,
      reason: txn.reason ?? '',
    });
  }

  for (const entry of ledger?.points?.topStudents ?? []) {
    into.leaderboard.push({
      id: `${yearId}:${entry.userId ?? entry.name}:${entry.rank}`,
      yearId,
      yearLabel,
      rank: entry.rank ?? 0,
      studentName: entry.name ?? 'Unknown',
      gradeLevel: entry.gradeLevel ?? undefined,
      sectionName: entry.sectionName ?? undefined,
      closingPoints: entry.closingPoints ?? 0,
    });
  }

  for (const snapshot of ledger?.market?.snapshots ?? []) {
    into.stock.push({
      id: `${yearId}:${snapshot.categoryCode}`,
      yearId,
      yearLabel,
      categoryName: snapshot.categoryName ?? snapshot.categoryCode ?? 'Unknown',
      openingKg: snapshot.openingKg ?? 0,
      closingKg: snapshot.closingKg ?? 0,
    });
  }
}

/**
 * Per-year records for the Reports hub "Year Records" folders: the points
 * ledger, the rollover leaderboard snapshot and the market stock snapshots.
 * A specific year makes one ledger request; "ALL" fans out per school year and
 * merges the results, tagging every row with its year.
 */
export function useYearRecords(yearId: string): YearRecords {
  const { allSchoolYears } = useSchoolYear();
  const [records, setRecords] = useState<RecordsAccumulator>({ points: [], leaderboard: [], stock: [] });
  const [loading, setLoading] = useState(true);
  const [degraded, setDegraded] = useState(false);

  const yearsKey = useMemo(() => allSchoolYears.map((year) => year.id).join(','), [allSchoolYears]);

  useEffect(() => {
    let cancelled = false;
    const yearIds =
      yearId && yearId !== 'ALL' ? [yearId] : yearsKey ? yearsKey.split(',') : [];

    if (yearIds.length === 0) {
      setRecords({ points: [], leaderboard: [], stock: [] });
      setDegraded(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    Promise.all(yearIds.map((id) => apiService.getSchoolYearLedger(id).catch(() => null)))
      .then((ledgers) => {
        if (cancelled) return;
        const next: RecordsAccumulator = { points: [], leaderboard: [], stock: [] };
        for (const ledger of ledgers) {
          if (ledger) collectLedger(ledger, next);
        }
        setRecords(next);
        setDegraded(ledgers.some((ledger) => ledger === null));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [yearId, yearsKey]);

  return { ...records, loading, degraded };
}
