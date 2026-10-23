import { useEffect, useMemo, useRef, useState } from 'react';
import { useMockData } from '../../../../hooks/useMockData';
import { useSchoolYear } from '../../../../hooks/useSchoolYear';
import { apiService } from '../../../../services/api';
import type { Report } from '../../../../types';

/**
 * Reports scoped to the School Year filter:
 * - 'ALL'  -> context reports merged with every school year fetched in parallel
 * - active -> the live context reports (no extra request)
 * - other  -> fetched on demand for that year
 * Falls back to the context reports whenever the API is unreachable.
 */
export function useHubReports(yearId: string): {
  reports: Report[];
  loading: boolean;
  degraded: boolean;
} {
  const { reports: contextReports } = useMockData();
  const { allSchoolYears, activeSchoolYear } = useSchoolYear();
  const contextRef = useRef(contextReports);
  contextRef.current = contextReports;

  const [reports, setReports] = useState<Report[]>(contextReports);
  const [loading, setLoading] = useState(false);
  const [degraded, setDegraded] = useState(false);

  const activeId = activeSchoolYear?.id ?? null;
  const yearsKey = useMemo(() => allSchoolYears.map((y) => y.id).join(','), [allSchoolYears]);

  useEffect(() => {
    let cancelled = false;
    const yearIds = yearsKey ? yearsKey.split(',') : [];

    if (yearId === 'ALL') {
      if (yearIds.length === 0) {
        setReports(contextRef.current);
        setDegraded(false);
        return;
      }
      setLoading(true);
      Promise.all(yearIds.map((id) => apiService.getReports({ schoolYearId: id }).catch(() => null)))
        .then((lists) => {
          if (cancelled) return;
          const failed = lists.some((list) => list === null);
          const merged = new Map<string, Report>();
          for (const report of contextRef.current) merged.set(report.id, report);
          for (const list of lists) {
            for (const report of list ?? []) merged.set(report.id, report);
          }
          setReports([...merged.values()]);
          setDegraded(failed);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }

    if (!activeId || yearId === activeId || yearIds.length === 0) {
      setReports(contextRef.current);
      setDegraded(false);
      return;
    }

    setLoading(true);
    apiService
      .getReports({ schoolYearId: yearId })
      .then((list) => {
        if (!cancelled) {
          setReports(Array.isArray(list) ? list : []);
          setDegraded(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setReports([]);
          setDegraded(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [yearId, activeId, yearsKey]);

  return { reports, loading, degraded };
}
