import { useCallback, useEffect, useRef, useState } from 'react';
import { apiService } from '../services/api';
import { RecordWalkInResult, WalkInProgress, WalkInStudentOption, WalkInTurnover } from '../types';

export const BOTTLE_PRESETS_ML = [250, 330, 350, 500, 600, 1000, 1500, 2000];

const GRAM_PRESETS: { ml: number; grams: number }[] = [
  { ml: 250, grams: 12 },
  { ml: 330, grams: 15 },
  { ml: 350, grams: 14 },
  { ml: 500, grams: 19 },
  { ml: 600, grams: 22 },
  { ml: 1000, grams: 39 },
  { ml: 1500, grams: 36 },
  { ml: 2000, grams: 48 },
];

/** Display-only mirror of the server gram estimates (server remains authoritative). */
export function gramsForBottle(bottleMl: number): number {
  if (!Number.isFinite(bottleMl) || bottleMl <= 0) return 0;
  if (bottleMl > 2000) return Math.round(bottleMl * 0.024);
  let best = GRAM_PRESETS[0];
  for (const preset of GRAM_PRESETS) {
    if (Math.abs(preset.ml - bottleMl) < Math.abs(best.ml - bottleMl)) best = preset;
  }
  return best.grams;
}

/** Display-only mirror of the session-total point rule (server remains authoritative). */
export function computeWalkInPoints(totalMl: number, ratePer500ml = 1): number {
  if (!Number.isFinite(totalMl) || totalMl <= 0) return 0;
  const rate = Number.isFinite(ratePer500ml) && ratePer500ml > 0 ? Math.floor(ratePer500ml) : 1;
  return Math.max(1, Math.floor((totalMl / 500) * rate));
}

export function formatLitres(totalMl: number): string {
  return (totalMl / 1000).toFixed(2).replace(/\.?0+$/, '');
}

export function formatBottleLabel(ml: number): string {
  return ml >= 1000 ? `${ml / 1000} L` : `${ml} ml`;
}

export function localDateString(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function useWalkInTurnover() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<WalkInStudentOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<WalkInStudentOption | null>(null);
  const [lines, setLines] = useState<Record<number, number>>({});
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<RecordWalkInResult | null>(null);
  const [today, setToday] = useState<WalkInTurnover[]>([]);
  const [selectedProgress, setSelectedProgress] = useState<WalkInProgress | null>(null);
  const idempotencyRef = useRef<string>(crypto.randomUUID());

  // Load the selected student's year-to-date kg progress for the summary rail.
  useEffect(() => {
    if (!selected) {
      setSelectedProgress(null);
      return;
    }
    let cancelled = false;
    apiService
      .getWalkInProgress(selected.id)
      .then((res) => {
        if (!cancelled) setSelectedProgress(res.progress || null);
      })
      .catch(() => {
        if (!cancelled) setSelectedProgress(null);
      });
    return () => {
      cancelled = true;
    };
  }, [selected]);

  // Debounced student search (skipped while a student is already selected).
  useEffect(() => {
    if (selected || query.trim().length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await apiService.searchWalkInStudents(query.trim());
        if (!cancelled) setResults(res.students || []);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, selected]);

  const refreshToday = useCallback(async () => {
    try {
      const res = await apiService.getWalkIns({ date: localDateString(), limit: 30 });
      setToday(res.turnovers || []);
    } catch {
      // Non-fatal: the station list is informational.
    }
  }, []);

  useEffect(() => {
    refreshToday();
  }, [refreshToday]);

  const setQuantity = useCallback((bottleMl: number, quantity: number) => {
    setLines((prev) => {
      const next = { ...prev };
      const clamped = Math.max(0, Math.min(200, Math.floor(Number(quantity)) || 0));
      if (clamped === 0) delete next[bottleMl];
      else next[bottleMl] = clamped;
      return next;
    });
  }, []);

  const entries = Object.entries(lines).map(([ml, qty]) => ({ bottleMl: Number(ml), quantity: qty }));
  const totalMl = entries.reduce((sum, e) => sum + e.bottleMl * e.quantity, 0);
  const totalBottles = entries.reduce((sum, e) => sum + e.quantity, 0);
  const totalGrams = entries.reduce((sum, e) => sum + gramsForBottle(e.bottleMl) * e.quantity, 0);

  const resetForm = useCallback(() => {
    setLines({});
    setNotes('');
    setSelected(null);
    setQuery('');
    setResults([]);
    setError(null);
  }, []);

  const submit = useCallback(async (): Promise<RecordWalkInResult | null> => {
    if (!selected || totalBottles === 0 || submitting) return null;
    setSubmitting(true);
    setError(null);
    try {
      const result = await apiService.recordWalkIn({
        studentId: selected.id,
        items: entries,
        notes: notes.trim() || undefined,
        idempotencyKey: idempotencyRef.current,
      });
      setReceipt(result);
      idempotencyRef.current = crypto.randomUUID();
      setLines({});
      setNotes('');
      await refreshToday();
      return result;
    } catch (err: any) {
      setError(err?.message || 'Failed to record turnover');
      return null;
    } finally {
      setSubmitting(false);
    }
  }, [selected, totalBottles, submitting, entries, notes, refreshToday]);

  return {
    query,
    setQuery,
    results,
    searching,
    selected,
    setSelected,
    lines,
    setQuantity,
    notes,
    setNotes,
    entries,
    totalMl,
    totalBottles,
    totalGrams,
    submitting,
    error,
    receipt,
    setReceipt,
    selectedProgress,
    today,
    refreshToday,
    submit,
    resetForm,
  };
}
