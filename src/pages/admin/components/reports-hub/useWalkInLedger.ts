import { useEffect, useState } from 'react';
import { apiService } from '../../../../services/api';
import type { WalkInRow } from './reportHubTypes';

function toIso(value: unknown): string {
  if (typeof value !== 'string' || !value) return '';
  const normalized = value.includes(' ') && !value.includes('T') ? value.replace(' ', 'T') : value;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

/** Walk-in bottle turnovers for the Reports hub Ledger, scoped by school year. */
export function useWalkInLedger(yearId: string): { rows: WalkInRow[]; loading: boolean } {
  const [rows, setRows] = useState<WalkInRow[]>([]);
  const [loading, setLoading] = useState(true);
  const param = yearId && yearId !== 'ALL' ? yearId : undefined;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    apiService
      .getWalkIns({ schoolYearId: param, limit: 5000 })
      .then((result) => {
        if (cancelled) return;
        const turnovers = Array.isArray(result?.turnovers) ? result.turnovers : [];
        setRows(
          turnovers.map((turnover: any) => ({
            id: turnover.id,
            date: toIso(turnover.createdAt),
            studentName: turnover.student?.name ?? 'Unknown student',
            gradeLevel: turnover.student?.gradeLevel ?? undefined,
            sectionName: turnover.student?.sectionName ?? undefined,
            bottles: turnover.totalBottles ?? 0,
            ml: turnover.totalMl ?? 0,
            grams: turnover.totalGrams ?? 0,
            points: turnover.pointsAwarded ?? 0,
            recordedBy: turnover.recordedByName ?? '',
          })),
        );
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [param]);

  return { rows, loading };
}
