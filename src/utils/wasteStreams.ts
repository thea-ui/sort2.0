import type { Report } from '../types';

/**
 * Residual waste (RA 9003 / DepEd Order No. 5, s. 2014) is what remains after the
 * biodegradable, recyclable and hazardous streams are separated. In SORT that is
 * exactly the NON_BIODEGRADABLE bin (wrappers, plastic films, sanitary waste).
 *
 * HAZARDOUS is a separate mandated stream and must never be folded into residual.
 * The legacy values GENERAL and ORGANIC no longer exist in the database.
 *
 * This helper is the single source of truth — every screen must use it so the
 * same number is shown everywhere.
 */
export const isResidualCategory = (category?: string | null): boolean =>
  category === 'NON_BIODEGRADABLE';

export const isResidualReport = (report: Report): boolean =>
  isResidualCategory(report.category);

/** Sums residual weight. Batches that were never weighed contribute 0. */
export const sumResidualKg = (reports: Report[]): number =>
  reports.reduce((sum, report) => sum + (report.weightCollected ?? 0), 0);

/**
 * Counts residual batches with no recorded weight. Surfaced in the UI so a total
 * is never presented as complete when part of it was never measured.
 */
export const countUnweighedResidual = (reports: Report[]): number =>
  reports.filter((report) => report.weightCollected == null).length;

export const residualRecords = (reports: Report[]): Report[] =>
  reports.filter(isResidualReport);
