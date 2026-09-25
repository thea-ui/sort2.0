import { describe, expect, it } from 'vitest';
import {
  clampPage,
  DEFAULT_ROWS_PER_PAGE,
  getPageWindow,
  getTotalPages,
  ROWS_PER_PAGE_OPTIONS,
} from '../usePagination';

describe('pagination math (SMART parity)', () => {
  it('computes total pages with a floor of 1', () => {
    expect(getTotalPages(0, 10)).toBe(1);
    expect(getTotalPages(1, 10)).toBe(1);
    expect(getTotalPages(10, 10)).toBe(1);
    expect(getTotalPages(11, 10)).toBe(2);
    expect(getTotalPages(25, 10)).toBe(3);
    expect(getTotalPages(25, 0)).toBe(1);
  });

  it('clamps pages into range', () => {
    expect(clampPage(0, 5)).toBe(1);
    expect(clampPage(3, 5)).toBe(3);
    expect(clampPage(9, 5)).toBe(5);
    expect(clampPage(-4, 1)).toBe(1);
  });

  it('shows every page up to 7, then a windowed set with first and last', () => {
    expect(getPageWindow(1, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(getPageWindow(3, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(getPageWindow(5, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(getPageWindow(1, 1)).toEqual([1]);
    expect(getPageWindow(1, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    // Beyond 7 pages the window is first, last, current ± 1 (handoff Part 2 §6).
    expect(getPageWindow(1, 12)).toEqual([1, 2, 12]);
    expect(getPageWindow(6, 12)).toEqual([1, 5, 6, 7, 12]);
    expect(getPageWindow(12, 12)).toEqual([1, 11, 12]);
  });

  it('exposes the SMART rows-per-page options and default', () => {
    expect(ROWS_PER_PAGE_OPTIONS).toEqual([10, 25, 50, 100]);
    expect(DEFAULT_ROWS_PER_PAGE).toBe(10);
  });
});
